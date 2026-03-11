import { Injectable, UnauthorizedException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { XuiApiService } from '../xui/xui-api.service'; // Проверь правильность пути!

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private xuiService: XuiApiService // Внедряем сервис панели 3x-ui
  ) {}

  async validateAdmin(username: string) {
    const admin = await this.prisma.user.findFirst({
      where: { 
        username: {
          equals: username,
          mode: 'insensitive',
        },
        isAdmin: true,
      },
    });

    if (!admin) {
      throw new UnauthorizedException('Admin access required');
    }

    return admin;
  }

  async getAllUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return users.map(user => ({
      id: user.id,
      telegramId: Number(user.telegramId),
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      balance: user.balance,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
    }));
  }

  async getUserDevices(userId: number) {
    const devices = await this.prisma.device.findMany({
      where: { userId },
      orderBy: { connectedAt: 'desc' },
    });

    return devices.map(d => ({
      id: d.id,
      name: d.customName || d.name,
      model: d.name,
      type: d.type,
      date: d.connectedAt.toLocaleDateString('ru-RU'),
      isActive: d.isActive,
      daysLeft: d.expiresAt
        ? Math.max(0, Math.ceil((d.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0,
      configLink: d.configLink,
    }));
  }

  async updateUserBalance(userId: number, balance: number) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { balance },
    });

    return { success: true, balance: user.balance };
  }

  async setAdminStatus(userId: number, isAdmin: boolean) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isAdmin },
    });

    return { success: true, isAdmin: user.isAdmin };
  }

  // ОБНОВЛЕННЫЙ МЕТОД: Получить все устройства для админки
  async getAllDevices() {
    const devices = await this.prisma.device.findMany({
      orderBy: { connectedAt: 'desc' },
      include: { user: true }
    });

    return devices.map(d => ({
      id: d.id,
      name: d.customName || d.name,
      userId: d.userId,
      email: d.user?.username || `@id${d.user?.telegramId}` || 'Неизвестно',
      type: d.type,
      date: d.connectedAt.toLocaleDateString('ru-RU'),
      isActive: d.isActive,
      configLink: d.configLink,
      uuid: d.uuid,             
      inboundId: 1 // <-- ИСПРАВЛЕНИЕ: Просто хардкодим 1, так как все VPN висят на 1 инбаунде
    }));
  }

  // ОБНОВЛЕННЫЙ МЕТОД: Синхронное удаление устройства
  async deleteDevice(deviceId: number) {
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) throw new NotFoundException('Device not found');

    const location = device.location || 'ch'; // 👈 Берем локацию из БД

    if (device.uuid) {
      // 👈 Передаем location вместо INBOUND_ID
      const xuiResponse = await this.xuiService.deleteClient(location, device.uuid);
      if (!xuiResponse?.success) {
        this.logger.warn(`Failed to delete client from 3x-ui (UUID: ${device.uuid}): ${xuiResponse?.msg || 'Unknown error'}`);
      }
    } else {
      this.logger.warn(`Device ${deviceId} missing uuid. Skipping 3x-ui deletion.`);
    }

    await this.prisma.device.delete({
      where: { id: deviceId },
    });

    return { success: true, deletedId: deviceId };
  }

  // 1. Изменение никнейма
  async updateUsername(userId: number, newUsername: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { username: newUsername },
    });
    return { success: true, username: user.username };
  }

  // 2. Перегенерация ссылки (Удалить старый XUI -> Создать новый XUI -> Обновить БД)
  async regenerateDeviceLink(deviceId: number) {
    const device = await this.prisma.device.findUnique({ where: { id: deviceId }, include: { user: true } });
    if (!device) throw new NotFoundException('Device not found');

    const location = device.location || 'ch'; // 👈 Берем локацию из БД

    if (device.uuid) {
      await this.xuiService.deleteClient(location, device.uuid); // 👈 location
    }

    const newUuid = crypto.randomUUID(); 
    const xuiData = await this.xuiService.addClient(location, { // 👈 location
      uuid: newUuid,
      name: device.customName || device.name,
      tgUid: device.user.telegramId.toString(),
      totalGb: 1000*1024*1024*1024, 
      expiryTime: device.expiresAt ? device.expiresAt.getTime() : 0 
    });

    if (!xuiData.success) {
      throw new Error(`Failed to regenerate link in 3x-ui: ${xuiData.msg}`);
    }

    const updatedDevice = await this.prisma.device.update({
      where: { id: deviceId },
      data: {
        uuid: xuiData.uuid,
        configLink: xuiData.configLink,
        email: xuiData.email
      }
    });

    return { success: true, newLink: updatedDevice.configLink };
  }

  // 3. Создание устройства админом (бесплатно)
  async addDeviceByAdmin(userId: number, data: { name: string, type: string, location?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const location = data.location || 'ch'; // 👈 Если админ не выбрал, по умолчанию Швейцария
    const newUuid = crypto.randomUUID();
    
    const xuiData = await this.xuiService.addClient(location, { // 👈 location
      uuid: newUuid,
      name: data.name,
      tgUid: user.telegramId.toString(),
      totalGb: 1000*1024*1024*1024, 
      expiryTime: Date.now() + 30 * 24 * 60 * 60 * 1000 
    });

    if (!xuiData.success) throw new Error(`3x-ui error: ${xuiData.msg}`);

    const newDevice = await this.prisma.device.create({
      data: {
        userId: user.id,
        name: data.name,
        customName: data.name,
        type: data.type,
        location: location, // 👈 Сохраняем локацию
        uuid: xuiData.uuid,
        configLink: xuiData.configLink,
        email: xuiData.email,
        isActive: true,
        connectedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });

    return { success: true, device: newDevice };
  }
}