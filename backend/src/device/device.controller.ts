import { Controller, Get, Post, Body, Param, Delete, Headers, UnauthorizedException , Put} from '@nestjs/common';
import { DeviceService } from './device.service';
import { XuiApiService } from '../xui/xui-api.service'; // Импортируем сервис панели
import { v4 as uuidv4 } from 'uuid'; // npm install uuid

@Controller('devices')
export class DeviceController {
  constructor(
    private readonly deviceService: DeviceService,
    private readonly xuiApiService: XuiApiService, // Внедряем сервис 3x-ui
  ) {}

  @Post()
  async create(@Body() createDeviceDto: any) {
    // 1. Генерируем новый UUID для клиента
    const clientUuid = uuidv4();
    const email = `user-${createDeviceDto.userId}-${Date.now()}`;

    // 2. Создаем клиента в панели 3x-ui
    const xuiResponse = await this.xuiApiService.addClient(1, {
      uuid: clientUuid,
      email: email,
      tgUid: createDeviceDto.tgUserId || "0",
      totalGb: 100, // или берем из DTO
      expiryTime: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 дней
    });

    if (!xuiResponse.success) {
      throw new Error(xuiResponse.msg || 'Ошибка при создании в панели 3x-ui');
    }

    // 3. Сохраняем в Postgres через твой DeviceService
    // Добавляем полученные данные от XUI в объект для сохранения
    return this.deviceService.create({
      ...createDeviceDto,
      uuid: clientUuid,
      configLink: xuiResponse.subscriptionUrl || `vless://${clientUuid}@your-ip:port...`, // Формируй ссылку здесь или бери из ответа
      isActive: true,
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    // 1. Сначала находим устройство в базе, чтобы узнать его UUID
    const device = await this.deviceService.findOne(+id);
    if (device && device.uuid) {
      // 2. Удаляем из панели 3x-ui
      await this.xuiApiService.deleteClient(1, device.uuid);
    }
    // 3. Удаляем из нашей базы
    return this.deviceService.remove(+id);
  }

  // ✅ ИСПРАВЛЕННЫЙ МЕТОД ДЛЯ ЗАМЕНЫ ССЫЛКИ
  @Post(':id/replace')
  async replaceDevice(
    @Headers('x-username') username: string,
    @Param('id') id: string
  ) {
    if (!username) throw new UnauthorizedException('Username required');
    return this.deviceService.replaceDeviceByUsername(parseInt(id), username);
  }

  // ✅ ИСПРАВЛЕННЫЙ МЕТОД ДЛЯ ОБНОВЛЕНИЯ ИМЕНИ
  @Put(':id/name')
  async updateDeviceName(
    @Headers('x-username') username: string,
    @Param('id') id: string,
    @Body('customName') customName: string
  ) {
    if (!username) throw new UnauthorizedException('Username required');
    if (!customName) throw new UnauthorizedException('customName required');
    return this.deviceService.updateDeviceNameByUsername(parseInt(id), username, customName);
  }

  @Get('user/:tgId')
  async getDevices(@Param('tgId') tgId: string) {
    return this.deviceService.getUserDevicesByTgId(tgId);
  }
}