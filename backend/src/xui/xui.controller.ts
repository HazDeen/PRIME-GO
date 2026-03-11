import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { XuiApiService } from './xui-api.service';

@Controller('xui')
export class XuiController {
  constructor(private readonly xuiService: XuiApiService) {}

  // Метод для проверки логина и работы API
  @Get('check')
  async checkStatus() {
    return { status: 'XUI API is connected and ready' };
  }

  // Создание клиента (теперь используем location вместо inboundId)
  @Post('client')
  async createClient(@Body() data: any) {
    const location = data.location || 'ch'; // По умолчанию Швейцария
    
    return this.xuiService.addClient(location, {
      uuid: data.uuid,
      email: data.email,
      tgUid: data.tgUid,
      totalGb: data.totalGb,
      expiryTime: data.expiryTime
    });
  }

  // Удаление клиента (принимаем строку location в параметрах ссылки)
  @Delete('client/:location/:uuid')
  async deleteClient(
    @Param('location') location: string,
    @Param('uuid') uuid: string
  ) {
    return this.xuiService.deleteClient(location, uuid);
  }
}