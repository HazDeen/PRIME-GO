import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { XuiApiService } from '../xui/xui-api.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);
  private readonly DEVICE_PRICE = 300;

  constructor(
    private prisma: PrismaService,
    private xuiApiService: XuiApiService,
  ) {}

  private async findUserByUsername(username: string) {
    const user = await this.prisma.user.findFirst({
      where: { 
        username: { equals: username, mode: 'insensitive' },
      },
    });
    if (!user) throw new NotFoundException(`User @${username} not found`);
    return user;
  }

  // --- МЕТОДЫ ДЛЯ КОНТРОЛЛЕРА (CRUD) ---

  async create(dto: any) {
    const userId = Number(dto.userId);
    
    const count = await this.prisma.device.count({ where: { userId } });
    if (count >= 5) throw new BadRequestException('Максимум 5 устройств');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Пользователь не найден');
    if (user.balance < this.DEVICE_PRICE) {
      throw new BadRequestException(`Недостаточно средств. Нужно ${this.DEVICE_PRICE} ₽`);
    }

    const clientUuid = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // 1. Создание в 3x-ui
    const xuiResponse = await this.xuiApiService.addClient(1, {
      uuid: clientUuid,
      email: `user-${userId}-${Date.now()}`,
      totalGb: 100,
      expiryTime: expiresAt.getTime(),
      tgUid: user.telegramId?.toString() || "0"
    });

    if (!xuiResponse || xuiResponse.success === false) {
        throw new BadRequestException('Ошибка VPN панели: ' + (xuiResponse?.msg || 'Panel unreachable'));
    }

    // 2. Транзакция в БД
    const result = await this.prisma.$transaction(async (tx) => {
      const device = await tx.device.create({
        data: {
          userId,
          name: dto.name,
          customName: dto.customName || dto.name,
          type: dto.type,
          uuid: clientUuid,
          configLink: xuiResponse.subscriptionUrl || '',
          isActive: true,
          expiresAt,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: this.DEVICE_PRICE } },
      });

      await tx.transaction.create({
        data: {
          userId,
          deviceId: device.id,
          amount: -this.DEVICE_PRICE,
          type: 'subscription',
          description: `Подписка: ${dto.customName || dto.name}`,
        },
      });

      return device;
    });

    return result;
  }

  async findAll() {
    return this.prisma.device.findMany({ include: { user: true } });
  }

  async findOne(id: number) {
    const device = await this.prisma.device.findUnique({ where: { id } });
    if (!device) throw new NotFoundException('Устройство не найдено');
    return device;
  }

  async remove(id: number) {
    const device = await this.findOne(id);
    if (device.uuid) {
      await this.xuiApiService.deleteClient(1, device.uuid).catch(e => 
        this.logger.error(`XUI Delete failed: ${e.message}`)
      );
    }
    return this.prisma.device.delete({ where: { id } });
  }

  // --- ЛОГИКА ОБНОВЛЕНИЯ И ЗАМЕНЫ ---

  async replaceDevice(deviceId: number, userId: number) {
    this.logger.log(`🔄 Full replacement of device ${deviceId} for user ${userId}`);
    
    const device = await this.prisma.device.findFirst({ where: { id: deviceId, userId } });
    if (!device) throw new NotFoundException('Device not found');

    // 1. Удаляем старого клиента из 3x-ui
    if (device.uuid) {
      await this.xuiApiService.deleteClient(1, device.uuid).catch(() => {
        this.logger.warn(`Could not delete old UUID ${device.uuid} from panel, proceeding...`);
      });
    }

    // 2. Генерируем новые данные
    const newUuid = uuidv4();
    const newEmail = `user-${userId}-${Date.now()}`;
    
    // 3. Создаем нового клиента в 3x-ui
    const xuiResponse = await this.xuiApiService.addClient(1, {
      uuid: newUuid,
      email: newEmail,
      totalGb: 100,
      expiryTime: device.expiresAt?.getTime() || (Date.now() + 30*24*60*60*1000),
    });

    if (!xuiResponse || !xuiResponse.success) {
      throw new BadRequestException('Failed to generate new link in VPN panel');
    }

    // 4. Обновляем запись в БД
    const updated = await this.prisma.device.update({
      where: { id: deviceId },
      data: {
        uuid: newUuid,
        configLink: xuiResponse.subscriptionUrl || '',
        updatedAt: new Date(),
      },
    });

    return {
      configLink: updated.configLink,
      uuid: updated.uuid
    };
  }

  async updateDeviceName(deviceId: number, userId: number, customName: string) {
    const device = await this.prisma.device.findFirst({ where: { id: deviceId, userId } });
    if (!device) throw new NotFoundException('Device not found');

    return this.prisma.device.update({
      where: { id: deviceId },
      data: { customName, updatedAt: new Date() },
    });
  }

  // --- WRAPPERS FOR USERNAME (CONTROLLER CALLS) ---

  async getUserDevicesByUsername(username: string) {
    const user = await this.findUserByUsername(username);
    const devices = await this.prisma.device.findMany({
      where: { userId: user.id },
      orderBy: { connectedAt: 'desc' },
    });

    return devices.map(d => ({
      id: d.id,
      name: d.customName || d.name,
      model: d.name,
      type: d.type,
      date: d.connectedAt.toLocaleDateString('ru-RU'),
      isActive: d.isActive,
      daysLeft: d.expiresAt ? Math.max(0, Math.ceil((d.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0,
      configLink: d.configLink,
      uuid: d.uuid
    }));
  }

  async replaceDeviceByUsername(deviceId: number, username: string) {
    const user = await this.findUserByUsername(username);
    return this.replaceDevice(deviceId, user.id);
  }

  async updateDeviceNameByUsername(deviceId: number, username: string, customName: string) {
    const user = await this.findUserByUsername(username);
    return this.updateDeviceName(deviceId, user.id, customName);
  }

  async deleteDeviceByUsername(deviceId: number, username: string) {
    const user = await this.findUserByUsername(username);
    return this.remove(deviceId);
  }
}