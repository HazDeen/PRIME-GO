import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { XuiApiService } from './xui-api.service';

@Controller('xui')
export class XuiController {
  constructor(private readonly xuiService: XuiApiService) {}

  // Метод для проверки логина и работы API
  @Get('check')
  async checkStatus() {
    return { status: 'XUI API is connected and ready' };
  }

  // Создание клиента (теперь вызываем addClient вместо createClient)
  @Post('client')
  async createClient(@Body() data: any) {
    // В сервисе мы переименовали метод в addClient
    return this.xuiService.addClient(data.inboundId || 1, {
      uuid: data.uuid,
      email: data.email,
      tgUid: data.tgUid,
      totalGb: data.totalGb,
      expiryTime: data.expiryTime
    });
  }

  // Удаление клиента
  @Delete('client/:inboundId/:uuid')
  async deleteClient(
    @Param('inboundId') inboundId: string,
    @Param('uuid') uuid: string
  ) {
    // В сервисе метод называется deleteClient
    return this.xuiService.deleteClient(+inboundId, uuid);
  }
}