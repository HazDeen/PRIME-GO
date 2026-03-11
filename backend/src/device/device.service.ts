import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { XuiApiService } from '../xui/xui-api.service';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);

  constructor(
    private prisma: PrismaService,
    private xuiApiService: XuiApiService,
    private configService: ConfigService,
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
    
    // 🌟 1. Узнаем будущий ID устройства
    const lastDevice = await this.prisma.device.findFirst({ orderBy: { id: 'desc' } });
    const nextId = (lastDevice?.id || 0) + 1;

    // 🌟 2. ФОРМИРУЕМ EMAIL И КОММЕНТАРИЙ
    const tgUsername = user.username ? `@${user.username}` : `ID:${user.telegramId}`;
    const clientEmail = `client${nextId}user`; // Формат: client1user, client2user...
    const linkRemark = `${tgUsername} (${dto.type})`; // Формат: @hazdeen (iPhone)

    const totalGbBytes = 1000 * 1024 * 1024 * 1024;
    const xuiResponse = await this.xuiApiService.addClient(location, {
      uuid: clientUuid,
      email: clientEmail,
      remark: linkRemark, // Передаем красивый комментарий для ссылки
      totalGb: totalGbBytes,
      expiryTime: expiresAt.getTime(),
      tgUid: user.telegramId.toString()
    });

    if (!xuiResponse || !xuiResponse.success) {
      this.logger.error(`XUI Error: ${xuiResponse?.msg}`);
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
          email: clientEmail, // Сохраняем системный ник (client1user) в БД
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
    this.logger.log(`🔄 Полная замена конфигурации для устройства ID: ${deviceId}`);
    
    const device = await this.prisma.device.findUnique({ 
      where: { id: deviceId },
      include: { user: true }
    });
    if (!device) throw new NotFoundException('Устройство не найдено');

    const location = device.location || 'ch';

    if (device.uuid) {
      await this.xuiApiService.deleteClient(location, device.uuid).catch(() => {});
    }

    const newUuid = uuidv4();
    
    // 🌟 При перегенерации ПЕРЕИСПОЛЬЗУЕМ старый email (например, client1user)
    const tgUsername = device.user.username ? `@${device.user.username}` : `ID:${device.user.telegramId}`;
    const clientEmail = device.email || `client${deviceId}user`;
    const linkRemark = `${tgUsername} (${device.type})`;
    
    const xuiResponse = await this.xuiApiService.addClient(location, {
      uuid: newUuid,
      email: clientEmail, // Старый email
      remark: linkRemark, // Красивый комментарий
      totalGb: 1000 * 1024 * 1024 * 1024,
      expiryTime: device.expiresAt?.getTime() || (Date.now() + 30*24*60*60*1000),
      tgUid: device.user.telegramId.toString()
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
}