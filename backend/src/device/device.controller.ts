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
  Logger 
} from '@nestjs/common';
import { DeviceService } from './device.service';

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
    type: string 
  }) {
    this.logger.log(`🚀 Запрос на создание устройства для TG: ${body.tgId}`);
    
    if (!body.tgId) {
      throw new BadRequestException('telegramId (tgId) обязателен');
    }

    try {
      // Вызываем метод сервиса, который делает ВСЁ: 
      // Проверяет баланс -> Создает в XUI -> Сохраняет в БД -> Списывает баланс
      return await this.deviceService.create(body);
    } catch (error) {
      this.logger.error(`❌ Ошибка создания: ${error.message}`);
      throw error;
    }
  }

  /**
   * Получение всех устройств пользователя по его Telegram ID
   * URL: GET /devices/user/1314191617
   */
  @Get('user/:tgId')
  async getByTgId(@Param('tgId') tgId: string) {
    this.logger.log(`🔍 Поиск устройств для пользователя TG: ${tgId}`);
    return this.deviceService.getUserDevicesByTgId(tgId);
  }

  /**
   * Удаление устройства
   * URL: DELETE /devices/1
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
    // В сервисе метод должен принимать id устройства
    return this.deviceService.replaceDevice(+id);
  }

  /**
   * Системный метод: получить вообще все устройства (для админа)
   */
  @Get('admin/all')
  async findAll() {
    return this.deviceService.findAll();
  }
  
  
}