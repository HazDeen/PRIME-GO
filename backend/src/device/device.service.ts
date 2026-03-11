import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { XuiApiService } from '../xui/xui-api.service';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);
  private readonly DEVICE_PRICE = 300;

  constructor(
    private prisma: PrismaService,
    private xuiApiService: XuiApiService,
    private configService: ConfigService,
  ) {}

  /**
   * УНИВЕРСАЛЬНЫЙ МЕТОД СОЗДАНИЯ (С поддержкой локаций)
   */
  async create(dto: { tgId: string; name: string; customName: string; type: string; location?: string }) {
    // 1. Ищем пользователя
    const user = await this.prisma.user.findUnique({
      where: { telegramId: BigInt(dto.tgId) }
    });

    if (!user) throw new NotFoundException('Пользователь не найден в базе данных');

    // 2. Проверки
    const count = await this.prisma.device.count({ where: { userId: user.id } });
    if (count >= 5) throw new BadRequestException('Максимум 5 устройств на один аккаунт');

    // 🌟 ОПРЕДЕЛЯЕМ ЛОКАЦИЮ И ЦЕНУ
    const location = dto.location || 'ch';
    const currentPrice = location === 'at' ? 150 : 300; // Австрия - 150, Швейцария - 300

    if (user.balance < currentPrice) {
      throw new BadRequestException(`Недостаточно средств. Стоимость: ${currentPrice} ₽`);
    }

    // 3. Подготовка данных
    const clientUuid = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    const clientEmail = `${Math.random().toString(36).substring(7)}`;

    // 4. Создание в нужной 3x-ui панели
    const totalGbBytes = 1000 * 1024 * 1024 * 1024;
    const xuiResponse = await this.xuiApiService.addClient(location, {
      uuid: clientUuid,
      email: clientEmail,
      totalGb: totalGbBytes,
      expiryTime: expiresAt.getTime(),
      tgUid: user.telegramId.toString()
    });

    if (!xuiResponse || !xuiResponse.success) {
      this.logger.error(`XUI Error: ${xuiResponse?.msg}`);
      throw new BadRequestException('Ошибка VPN панели: ' + (xuiResponse?.msg || 'Не удалось создать клиента'));
    }

    // 5. ТРАНЗАКЦИЯ: БД + Баланс
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

      // 🌟 Списываем нужную сумму
      await tx.user.update({
        where: { id: user.id },
        data: { balance: { decrement: currentPrice } },
      });

      // 🌟 Логируем транзакцию с нужной суммой и указанием локации
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

  /**
   * Получение списка устройств
   */
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

  /**
   * Удаление устройства с нужного сервера
   */
  async remove(id: number) {
    const device = await this.prisma.device.findUnique({ where: { id } });
    if (!device) throw new NotFoundException('Устройство не найдено');

    if (device.uuid) {
      const location = device.location || 'ch'; // 👈 Берем локацию из базы
      await this.xuiApiService.deleteClient(location, device.uuid).catch(e => 
        this.logger.error(`Ошибка удаления в XUI (ID: ${device.uuid}): ${e.message}`)
      );
    }

    return this.prisma.device.delete({ where: { id } });
  }

  /**
   * Обновление имени
   */
  async updateDeviceName(deviceId: number, customName: string) {
    return this.prisma.device.update({
      where: { id: deviceId },
      data: { customName, updatedAt: new Date() },
    });
  }

  /**
   * Перегенерация на нужном сервере
   */
  async replaceDevice(deviceId: number) {
    this.logger.log(`🔄 Полная замена конфигурации для устройства ID: ${deviceId}`);
    
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) throw new NotFoundException('Устройство не найдено');

    const location = device.location || 'ch'; // 👈 Узнаем, где оно было создано

    // 1. Удаляем со старого сервера
    if (device.uuid) {
      await this.xuiApiService.deleteClient(location, device.uuid).catch(() => {
        this.logger.warn(`Не удалось удалить старый UUID ${device.uuid} из панели, продолжаем...`);
      });
    }

    const newUuid = uuidv4();
    const clientEmail = `${Math.random().toString(36).substring(7)}`
    
    // 2. Создаем на том же сервере
    const xuiResponse = await this.xuiApiService.addClient(location, {
      uuid: newUuid,
      name: device.customName || device.name,
      email: clientEmail,
      totalGb: 1000 * 1024 * 1024 * 1024,
      expiryTime: device.expiresAt?.getTime() || (Date.now() + 30*24*60*60*1000),
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

    this.logger.log(`✅ Ссылка для устройства ${deviceId} успешно заменена на VLESS`);

    return { configLink: updated.configLink, uuid: updated.uuid };
  }

  async findAll() {
    return this.prisma.device.findMany({
      include: { user: true },
      orderBy: { connectedAt: 'desc' }
    });
  }
}