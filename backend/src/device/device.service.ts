import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
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
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) throw new NotFoundException('Устройство не найдено');

    const location = device.location || 'ch';

    if (device.uuid) {
      await this.xuiApiService.deleteClient(location, device.uuid).catch(() => {});
    }

    const newUuid = uuidv4();
    
    // 🌟 При перегенерации ключа сохраняем оригинальный client{ID}user!
    const clientEmail = device.email || `client${deviceId}user`;
    
    const xuiResponse = await this.xuiApiService.addClient(location, {
      uuid: newUuid,
      email: clientEmail, 
      totalGb: 1000 * 1024 * 1024 * 1024,
      expiryTime: device.expiresAt?.getTime() || (Date.now() + 30*24*60*60*1000),
      tgUid: "0"
    });

    if (!xuiResponse || !xuiResponse.success) {
      throw new BadRequestException('Ошибка при генерации новой ссылки в VPN панели');
    }

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

  async renewDevice(deviceId: number, userId: number) {
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!device) throw new NotFoundException('Устройство не найдено');
    if (!user) throw new NotFoundException('Пользователь не найден');

    const location = device.location || 'ch';
    const price = location === 'at' ? 150 : 300;

    if (user.balance < price) {
      throw new BadRequestException(`Недостаточно средств. Стоимость продления: ${price} ₽`);
    }

    // Считаем новую дату: если уже просрочен - от сегодня + 30 дней. Если еще активен - прибавляем 30 дней к остатку.
    const currentExpiry = device.expiresAt ? device.expiresAt.getTime() : Date.now();
    const baseTime = currentExpiry > Date.now() ? currentExpiry : Date.now();
    const newExpiryTime = baseTime + (30 * 24 * 60 * 60 * 1000);
    const newExpiresAt = new Date(newExpiryTime);

    // Обновляем в 3x-ui
    if (device.uuid) {
      const xuiRes = await this.xuiApiService.updateClientExpiry(location, device.uuid, newExpiryTime);
      if (!xuiRes.success) throw new BadRequestException('Ошибка при обновлении в панели VPN');
    }

    // Транзакция: списываем деньги, обновляем базу, пишем историю
    return await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { balance: { decrement: price } },
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          deviceId: device.id,
          amount: -price,
          type: 'subscription',
          description: `Продление VPN (${location.toUpperCase()}): ${device.customName || device.name}`,
        },
      });

      return await tx.device.update({
        where: { id: device.id },
        data: { expiresAt: newExpiresAt, isActive: true },
      });
    });
  }
}