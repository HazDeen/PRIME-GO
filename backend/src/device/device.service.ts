import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { XuiApiService } from '../xui/xui-api.service';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);
  private readonly DEVICE_PRICE = 300;
  private readonly inboundId: number;

  constructor(
    private prisma: PrismaService,
    private xuiApiService: XuiApiService,
    private configService: ConfigService,
  ) {
    this.inboundId = this.configService.get<number>('XUI_INBOUND_ID') || 2;
  }

  /**
   * УНИВЕРСАЛЬНЫЙ МЕТОД СОЗДАНИЯ (Использует tgId)
   */
  async create(dto: { tgId: string; name: string; customName: string; type: string }) {
    // 1. Ищем пользователя по Telegram ID (BigInt)
    const user = await this.prisma.user.findUnique({
      where: { telegramId: BigInt(dto.tgId) }
    });

    if (!user) throw new NotFoundException('Пользователь не найден в базе данных');

    // 2. Проверки: лимит устройств и баланс
    const count = await this.prisma.device.count({ where: { userId: user.id } });
    if (count >= 5) throw new BadRequestException('Максимум 5 устройств на один аккаунт');

    if (user.balance < this.DEVICE_PRICE) {
      throw new BadRequestException(`Недостаточно средств. Стоимость: ${this.DEVICE_PRICE} ₽`);
    }

    // 3. Подготовка данных
    const clientUuid = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    const clientEmail = `${user.id}-${Math.random().toString(36).substring(7)}`;

    // 4. Создание в 3x-ui панели
    // totalGb: 100 GB в байтах. (100 * 1024^3)
    const totalGbBytes = 1000 * 1024 * 1024 * 1024;

    const xuiResponse = await this.xuiApiService.addClient(this.inboundId, {
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

    // 5. ТРАНЗАКЦИЯ: БД + Баланс + Транзакция
    return await this.prisma.$transaction(async (tx) => {
      // Создаем устройство
      const device = await tx.device.create({
        data: {
          userId: user.id,
          name: dto.name, // Это модель (iPhone 15)
          customName: dto.customName || dto.name,
          type: dto.type,
          uuid: clientUuid,
          email: clientEmail,
          configLink: xuiResponse.configLink || '',
          isActive: true,
          expiresAt,
        },
      });

      // Списываем баланс
      await tx.user.update({
        where: { id: user.id },
        data: { balance: { decrement: this.DEVICE_PRICE } },
      });

      // Логируем транзакцию
      await tx.transaction.create({
        data: {
          userId: user.id,
          deviceId: device.id,
          amount: -this.DEVICE_PRICE,
          type: 'subscription',
          description: `Оплата устройства: ${dto.customName || dto.name}`,
        },
      });

      return device;
    });
  }

  /**
   * Получение списка устройств по TG ID (для фронтенда)
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
   * Удаление устройства (БД + XUI)
   */
  async remove(id: number) {
    const device = await this.prisma.device.findUnique({ where: { id } });
    if (!device) throw new NotFoundException('Устройство не найдено');

    if (device.uuid) {
      await this.xuiApiService.deleteClient(this.inboundId, device.uuid).catch(e => 
        this.logger.error(`Ошибка удаления в XUI (ID: ${device.uuid}): ${e.message}`)
      );
    }

    return this.prisma.device.delete({ where: { id } });
  }

  // --- Остальные методы (replace, updateName) ---
  // Их тоже лучше перевести на работу по ID устройства напрямую, 
  // так как ID в базе уникален и username/tgId для поиска записи уже не обязателен.

  async updateDeviceName(deviceId: number, customName: string) {
    return this.prisma.device.update({
      where: { id: deviceId },
      data: { customName, updatedAt: new Date() },
    });
  }


  async replaceDevice(deviceId: number) {
    this.logger.log(`🔄 Полная замена конфигурации для устройства ID: ${deviceId}`);
    
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) throw new NotFoundException('Устройство не найдено');

    // 1. Удаляем старого клиента из 3x-ui
    if (device.uuid) {
      await this.xuiApiService.deleteClient(this.inboundId, device.uuid).catch(() => {
        this.logger.warn(`Не удалось удалить старый UUID ${device.uuid} из панели, продолжаем...`);
      });
    }

    // 2. Генерируем новый UUID
    const newUuid = uuidv4();
    
    // 3. Создаем НОВОГО клиента в 3x-ui
    const xuiResponse = await this.xuiApiService.addClient(this.inboundId, {
      uuid: newUuid,
      name: device.customName || device.name, // Используем текущее имя для ссылки
      email: `ref-${device.userId}-${Date.now()}`,
      totalGb: 100 * 1024 * 1024 * 1024,
      expiryTime: device.expiresAt?.getTime() || (Date.now() + 30*24*60*60*1000),
    });

    if (!xuiResponse || !xuiResponse.success) {
      throw new BadRequestException('Ошибка при генерации новой ссылки в VPN панели');
    }

    // 4. Обновляем запись в БД новой VLESS ссылкой
    const updated = await this.prisma.device.update({
      where: { id: deviceId },
      data: {
        uuid: newUuid,
        configLink: xuiResponse.configLink, // <--- Сюда придет vless://...
        updatedAt: new Date(),
      },
    });

    this.logger.log(`✅ Ссылка для устройства ${deviceId} успешно заменена на VLESS`);

    return {
      configLink: updated.configLink,
      uuid: updated.uuid
    };
  }

  async findAll() {
    return this.prisma.device.findMany({
      include: { 
        user: true // Чтобы видеть, чье это устройство
      },
      orderBy: { 
        connectedAt: 'desc' 
      }
    });
  }
}