import { Injectable, BadRequestException, Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { XuiApiService } from '../xui/xui-api.service';
import { v4 as uuidv4 } from 'uuid';
//
@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);

  constructor(
    private prisma: PrismaService,
    private xuiApiService: XuiApiService,
  ) {}

  async create(dto: { tgId: string; name: string; customName: string; type: string; location?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { telegramId: BigInt(dto.tgId) }
    });

    if (!user) throw new NotFoundException('Пользователь не найден в базе данных');

    const count = await this.prisma.device.count({ where: { userId: user.id } });
    if (count >= 5) throw new BadRequestException('Максимум 5 устройств на один аккаунт');

    const location = dto.location || 'ch';
    const currentPrice = location === 'at' ? 150 : 300; 

    if (user.balance < currentPrice) {
      throw new BadRequestException(`Недостаточно средств. Стоимость: ${currentPrice} ₽`);
    }

    const clientUuid = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    // 🌟 НОВАЯ ЛОГИКА: Рандомный ID от 1 до 100
    let clientEmail = '';
    let isEmailFree = false;
    const maxSlots = 100;
    
    // Стартуем со случайного числа
    let startNum = Math.floor(Math.random() * maxSlots) + 1; 
    let currentNum = startNum;
    let attempts = 0;

    // Цикл проверки занятости
    while (!isEmailFree && attempts < maxSlots) {
      clientEmail = `client${currentNum}user`; 

      // Проверяем, есть ли уже такой email в нашей БД
      const existing = await this.prisma.device.findFirst({
        where: { email: clientEmail }
      });

      if (!existing) {
        isEmailFree = true; // Нашли свободный слот!
        break;
      }

      // Если занято, берем следующее число по кругу (до 100, затем снова 1)
      currentNum = (currentNum % maxSlots) + 1;
      attempts++;
    }

    if (!isEmailFree) {
      throw new BadRequestException(`Все ${maxSlots} слотов для VPN заняты. Обратитесь к администратору.`);
    }

    const totalGbBytes = 1000 * 1024 * 1024 * 1024;
    
    // Передаем правильный email в 3x-ui (inboundId подтянется из .env автоматически)
    const xuiResponse = await this.xuiApiService.addClient(location, {
      uuid: clientUuid,
      email: clientEmail, 
      totalGb: totalGbBytes,
      expiryTime: expiresAt.getTime(),
      tgUid: user.telegramId.toString()
    });

    if (!xuiResponse || !xuiResponse.success) {
      throw new BadRequestException('Ошибка VPN панели: ' + (xuiResponse?.msg || 'Не удалось создать клиента'));
    }

    return await this.prisma.$transaction(async (tx) => {
      const device = await tx.device.create({
        data: {
          userId: user.id,
          name: dto.name,
          customName: dto.customName || dto.name,
          type: dto.type,
          location: location,
          uuid: clientUuid,
          email: clientEmail, 
          configLink: xuiResponse.configLink || '',
          isActive: true,
          expiresAt,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { balance: { decrement: currentPrice } },
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          deviceId: device.id,
          amount: -currentPrice,
          type: 'subscription',
          description: `Оплата VPN (${location.toUpperCase()}): ${dto.customName || dto.name}`,
        },
      });

      return device;
    });
  }

  async getUserDevicesByTgId(tgId: string) {
    const user = await this.prisma.user.findUnique({
      where: { telegramId: BigInt(tgId) },
      include: { devices: { orderBy: { connectedAt: 'desc' } } }
    });

    if (!user) return [];

    return user.devices.map(d => ({
      ...d,
      name: d.customName || d.name,
      model: d.name,
      date: d.connectedAt.toLocaleDateString('ru-RU'),
      daysLeft: d.expiresAt ? Math.max(0, Math.ceil((d.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0,
    }));
  }

  async remove(id: number) {
    const device = await this.prisma.device.findUnique({ where: { id } });
    if (!device) throw new NotFoundException('Устройство не найдено');

    if (device.uuid) {
      const location = device.location || 'ch';
      await this.xuiApiService.deleteClient(location, device.uuid).catch(e => 
        this.logger.error(`Ошибка удаления в XUI: ${e.message}`)
      );
    }

    return this.prisma.device.delete({ where: { id } });
  }

  async updateDeviceName(deviceId: number, customName: string) {
    return this.prisma.device.update({
      where: { id: deviceId },
      data: { customName, updatedAt: new Date() },
    });
  }

  async replaceDevice(deviceId: number) {
    // 1. Подтягиваем устройство ВМЕСТЕ с данными пользователя (чтобы вернуть tgUid)
    const device = await this.prisma.device.findUnique({ 
      where: { id: deviceId },
      include: { user: true } // 👈 Обязательно добавляем связь
    });
    
    if (!device) throw new NotFoundException('Устройство не найдено');

    const location = device.location || 'ch';

    // Удаляем старого клиента из панели
    if (device.uuid) {
      await this.xuiApiService.deleteClient(location, device.uuid).catch(() => {});
    }

    const newUuid = uuidv4();
    
    // Оставляем оригинальное имя клиента (client{ID}user)
    const clientEmail = device.email || `client${deviceId}user`;
    
    // 2. Создаем нового клиента в 3x-ui
    const xuiResponse = await this.xuiApiService.addClient(location, {
      uuid: newUuid,
      email: clientEmail, 
      totalGb: 1000 * 1024 * 1024 * 1024,
      
      // 🚨 ГЛАВНЫЙ ФИКС ДАТЫ: 
      // Берем дату СТРОГО из базы данных. Если устройство безлимитное (null), ставим 0. 
      // Никаких подарочных +30 дней!
      expiryTime: device.expiresAt ? device.expiresAt.getTime() : 0, 
      
      // 🚨 ФИКС TG ID: Восстанавливаем привязку к Telegram пользователя в XUI
      tgUid: device.user ? device.user.telegramId.toString() : "0" 
    });

    if (!xuiResponse || !xuiResponse.success) {
      throw new BadRequestException('Ошибка при генерации новой ссылки в VPN панели');
    }

    // 3. Сохраняем новую ссылку в базу (дата окончания при этом остается старой)
    const updated = await this.prisma.device.update({
      where: { id: deviceId },
      data: {
        uuid: newUuid,
        configLink: xuiResponse.configLink,
        updatedAt: new Date(),
      },
    });

    return { configLink: updated.configLink, uuid: updated.uuid };
  }

  async findAll() {
    return this.prisma.device.findMany({
      include: { user: true },
      orderBy: { connectedAt: 'desc' }
    });
  }

  async renewDevice(userId: number, deviceId: number) {
    // 1. Находим устройство и пользователя
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!device || device.userId !== userId) throw new NotFoundException('Устройство не найдено');

    // 2. Определяем стоимость (зависит от локации)
    const price = device.location === 'at' ? 150 : 300;

    // 3. Проверяем баланс
    if (user.balance < price) {
      throw new BadRequestException(`Недостаточно средств. Пополните баланс на ${price - user.balance} ₽`);
    }

    // 4. Вычисляем новую дату окончания (+30 дней)
    // Если подписка еще активна, плюсуем 30 дней к текущей дате окончания.
    // Если уже истекла, плюсуем 30 дней от сегодняшнего дня.
    const now = new Date();
    const currentExpiry = device.expiresAt && device.expiresAt > now ? device.expiresAt : now;
    const newExpiresAt = new Date(currentExpiry.getTime() + 30 * 24 * 60 * 60 * 1000); // + 30 дней

    // 5. Запрос к 3X-UI панели (Обновляем expiryTime клиента)
    try {
      // Здесь твой код обращения к API 3x-ui (updateClient)
      // Примерный формат:
      // await this.xuiService.updateClient(device.inboundId, device.uuid, {
      //   expiryTime: newExpiresAt.getTime() 
      // });
    } catch (error) {
      throw new InternalServerErrorException('Ошибка связи с сервером VPN. Попробуйте позже.');
    }

    // 6. Транзакция БД: Списываем деньги, обновляем девайс, пишем историю
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { balance: { decrement: price } }
      }),
      this.prisma.device.update({
        where: { id: deviceId },
        data: { expiresAt: newExpiresAt, isActive: true }
      }),
      this.prisma.transaction.create({
        data: {
          userId,
          amount: -price,
          type: 'renew',
          description: `Продление VPN: ${device.name || 'Устройство'}`
        }
      })
    ]);

    return { success: true, message: 'Подписка продлена', expiresAt: newExpiresAt };
  };
}