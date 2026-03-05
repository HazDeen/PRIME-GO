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

    const INBOUND_ID = 1; // <-- ИСПРАВЛЕНИЕ: Используем инбаунд 1 по умолчанию

    // Пытаемся удалить из панели 3x-ui (проверяем только uuid)
    if (device.uuid) {
      const xuiResponse = await this.xuiService.deleteClient(INBOUND_ID, device.uuid);
      if (!xuiResponse?.success) {
        this.logger.warn(`Failed to delete client from 3x-ui (UUID: ${device.uuid}): ${xuiResponse?.msg || 'Unknown error'}`);
      }
    } else {
      this.logger.warn(`Device ${deviceId} missing uuid. Skipping 3x-ui deletion.`);
    }

    // Удаляем из PostgreSQL
    await this.prisma.device.delete({
      where: { id: deviceId },
    });

    return { success: true, deletedId: deviceId };
  }
}