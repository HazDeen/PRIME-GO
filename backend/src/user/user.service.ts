import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private prisma: PrismaService) {}

  async findUserByUsername(username: string) {
    const user = await this.prisma.user.findFirst({
      where: { 
        username: {
          equals: username,
          mode: 'insensitive',
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User @${username} not found`);
    }

    return user;
  }

  async getBalance(userId: number) {
    this.logger.log(`💰 Getting balance for user ${userId}`);
    
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const activeDevices = await this.prisma.device.count({
      where: { userId, isActive: true },
    });

    const dailyRate = activeDevices * 10;
    const daysLeft = dailyRate > 0 ? Math.floor(user.balance / dailyRate) : 30;

    return {
      balance: user.balance,
      daysLeft: daysLeft > 30 ? 30 : daysLeft,
      activeDevices,
    };
  }

  async getBalanceByUsername(username: string) {
    const user = await this.findUserByUsername(username);
    return this.getBalance(user.id);
  }

  async getProfile(userId: number) {
    this.logger.log(`👤 Getting profile for user ${userId}`);
    
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        devices: {
          orderBy: { connectedAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      telegramId: Number(user.telegramId),
      avatarUrl: user.avatarUrl,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      balance: user.balance,
      isAdmin: user.isAdmin,
      devices: user.devices.map(d => ({
        id: d.id,
        name: d.customName || d.name,
        model: d.name,
        type: d.type,
        date: d.connectedAt,
        isActive: d.isActive,
        configLink: d.configLink,
        daysLeft: d.expiresAt ? Math.max(0, Math.ceil((d.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0,
      })),
    };
  }

  async getProfileByUsername(username: string) {
    const user = await this.findUserByUsername(username);
    return this.getProfile(user.id);
  }

  async topUpBalance(userId: number, amount: number) {
    this.logger.log(`💰 Top up user ${userId} with ${amount}`);
    
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        balance: {
          increment: amount,
        },
      },
    });

    await this.prisma.transaction.create({
      data: {
        userId,
        amount,
        type: 'topup',
        description: 'Пополнение баланса',
      },
    });

    this.logger.log(`✅ New balance: ${updatedUser.balance}`);
    
    return {
      success: true,
      balance: updatedUser.balance,
    };
  }

  async topUpBalanceByUsername(username: string, amount: number) {
    const user = await this.findUserByUsername(username);
    return this.topUpBalance(user.id, amount);
  }

  async syncTelegramAvatar(username: string) {
    this.logger.log(`🔄 Синхронизация аватарки для @${username}`);
    const user = await this.findUserByUsername(username);
    const botToken = process.env.BOT_TOKEN;
    const tgId = Number(user.telegramId);

    try {
      // 1. Получаем список фотографий профиля
      const photosRes = await fetch(`https://api.telegram.org/bot${botToken}/getUserProfilePhotos?user_id=${tgId}&limit=1`);
      const photosData = await photosRes.json();

      if (photosData.ok && photosData.result.total_count > 0) {
        // Берем самую маленькую версию актуального фото (для экономии места)
        const fileId = photosData.result.photos[0][0].file_id;
        
        // 2. Получаем путь к файлу на серверах Telegram
        const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
        const fileData = await fileRes.json();
        
        if (fileData.ok) {
          const filePath = fileData.result.file_path;
          
          // 3. Скачиваем картинку и переводим в Base64
          const imageRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
          const arrayBuffer = await imageRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const avatarBase64 = `data:image/jpeg;base64,${buffer.toString('base64')}`;

          // 4. Сохраняем в базу данных
          await this.prisma.user.update({
            where: { id: user.id },
            data: { avatarUrl: avatarBase64 }
          });

          return { success: true, avatarUrl: avatarBase64 };
        }
      }
      return { success: false, message: 'У вас нет публичного фото в Telegram' };
    } catch (e) {
      this.logger.error('Ошибка синхронизации аватарки:', e);
      return { success: false, message: 'Ошибка связи с Telegram API' };
    }
  }
}