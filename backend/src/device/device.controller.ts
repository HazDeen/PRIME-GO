import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Delete, 
  Put, 
  NotFoundException, 
  BadRequestException,
  ForbiddenException, // 👈 Импортировали ошибку доступа
  Logger,
  Headers
} from '@nestjs/common';
import { DeviceService } from './device.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Controller('devices')
export class DeviceController {
  private readonly logger = new Logger(DeviceController.name);

  constructor(private readonly deviceService: DeviceService) {}

  /**
   * Создание нового устройства (V2)
   * Принимает: tgId, name, customName, type
   */
  @Post()
  async create(@Body() body: { 
    tgId: string; 
    name: string; 
    customName: string; 
    type: string;
    location?: string; // 👈 Добавили location
  }) {
    this.logger.log(`🚀 Запрос на создание устройства для TG: ${body.tgId}`);
    
    if (!body.tgId) {
      throw new BadRequestException('telegramId (tgId) обязателен');
    }

    try {
      // ==========================================
      // 🚨 ЖЕСТКАЯ ПРОВЕРКА БЛОКИРОВКИ (ТУМБЛЕРЫ)
      // ==========================================
      const settings = await prisma.settings.findFirst();
      const location = body.location || 'ch'; // Узнаем, куда просится клиент
      
      if (settings) {
        // 1. Проверяем глобальную блокировку
        if (settings.blockAll) {
          throw new ForbiddenException('⛔️ Создание новых VPN временно приостановлено сервером.');
        }

        // 2. 🌍 ПРОВЕРКА БЛОКИРОВКИ КОНКРЕТНЫХ СЕРВЕРОВ
        if (location === 'ch' && settings.blockCh) {
          throw new ForbiddenException('⛔️ Создание VPN на сервере Швейцарии (CH) временно приостановлено.');
        }
        if (location === 'at' && settings.blockAt) {
          throw new ForbiddenException('⛔️ Создание VPN на сервере Австрии (AT) временно приостановлено.');
        }

        const user = await prisma.user.findFirst({
          where: { telegramId: BigInt(body.tgId) } 
        });

        if (user) {
          if (settings.blockUsers && !user.isAdmin) {
            throw new ForbiddenException('⛔️ Создание VPN для обычных пользователей закрыто.');
          }
          if (settings.blockAdmins && user.isAdmin) {
            throw new ForbiddenException('⛔️ Создание VPN для администраторов закрыто.');
          }
        }
      }
      // ==========================================

      return await this.deviceService.create(body);
    } catch (error) {
      this.logger.error(`❌ Ошибка создания: ${error.message}`);
      throw error; 
    }
  }

  /**
   * Получение всех устройств пользователя по его Telegram ID
   */
  @Get('user/:tgId')
  async getByTgId(@Param('tgId') tgId: string) {
    this.logger.log(`🔍 Поиск устройств для пользователя TG: ${tgId}`);
    return this.deviceService.getUserDevicesByTgId(tgId);
  }

  /**
   * Удаление устройства
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.deviceService.remove(+id);
  }

  /**
   * Обновление названия (Кастомного)
   */
  @Put(':id/name')
  async updateName(
    @Param('id') id: string, 
    @Body('customName') customName: string
  ) {
    return this.deviceService.updateDeviceName(+id, customName);
  }

  /**
   * Перегенерация ссылки (Замена UUID/SubId)
   */
  @Post(':id/replace')
  async replace(@Param('id') id: string) {
    return this.deviceService.replaceDevice(+id);
  }

  /**
   * Системный метод: получить вообще все устройства (для админа)
   */
  @Get('admin/all')
  async findAll() {
    return this.deviceService.findAll();
  }

  @Post(':id/renew')
  async renewDevice(
    @Param('id') id: string, 
    @Headers('authorization') auth: string,
    @Body('userId') bodyUserId: number // 👈 Принимаем ID из body
  ) {
    let userId = bodyUserId;

    // Безопасный фоллбэк: если ID в body нет, аккуратно достаем из токена
    if (!userId && auth && auth.includes('Bearer ') && auth.includes('.')) {
      try {
        const token = auth.split(' ')[1];
        if (token && token.includes('.')) {
          const base64Payload = token.split('.')[1];
          const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf8'));
          userId = payload.id || payload.sub;
        }
      } catch (e) {
        console.error('Ошибка парсинга токена:', e.message);
      }
    }

    if (!userId) {
      // Теперь сервер не падает с ошибкой 500, а красиво возвращает 400
      throw new BadRequestException('Не удалось определить ID пользователя. Перезайдите в аккаунт.');
    }

    return this.deviceService.renewDevice(Number(userId), Number(id));
  }
}