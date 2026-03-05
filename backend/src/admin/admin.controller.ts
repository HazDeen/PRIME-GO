import { Controller, Get, Put, Post, Delete, Param, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  async getAllUsers(@Headers('x-username') username: string) {
    if (!username) throw new UnauthorizedException('Username required');
    await this.adminService.validateAdmin(username);
    return this.adminService.getAllUsers();
  }

  @Get('users/:userId/devices')
  async getUserDevices(
    @Headers('x-username') username: string,
    @Param('userId') userId: string
  ) {
    if (!username) throw new UnauthorizedException('Username required');
    await this.adminService.validateAdmin(username);
    return this.adminService.getUserDevices(parseInt(userId));
  }

  @Put('users/:userId/balance')
  async updateUserBalance(
    @Headers('x-username') username: string,
    @Param('userId') userId: string,
    @Body() body: { balance: number }
  ) {
    if (!username) throw new UnauthorizedException('Username required');
    await this.adminService.validateAdmin(username);
    return this.adminService.updateUserBalance(parseInt(userId), body.balance);
  }

  @Put('users/:userId/admin')
  async setAdminStatus(
    @Headers('x-username') username: string,
    @Param('userId') userId: string,
    @Body() body: { isAdmin: boolean }
  ) {
    if (!username) throw new UnauthorizedException('Username required');
    await this.adminService.validateAdmin(username);
    return this.adminService.setAdminStatus(parseInt(userId), body.isAdmin);
  }

  // НОВЫЙ РОУТ: Получить все устройства для админки
  @Get('devices')
  async getAllDevices(@Headers('x-username') username: string) {
    if (!username) throw new UnauthorizedException('Username required');
    await this.adminService.validateAdmin(username);
    return this.adminService.getAllDevices();
  }

  // НОВЫЙ РОУТ: Удалить устройство
  @Delete('devices/:deviceId')
  async deleteDevice(
    @Headers('x-username') username: string,
    @Param('deviceId') deviceId: string
  ) {
    if (!username) throw new UnauthorizedException('Username required');
    await this.adminService.validateAdmin(username);
    return this.adminService.deleteDevice(parseInt(deviceId));
  }

  // 1. Изменение никнейма пользователя
  @Put('users/:userId/username')
  async updateUsername(
    @Headers('x-username') adminUsername: string,
    @Param('userId') userId: string,
    @Body() body: { newUsername: string }
  ) {
    if (!adminUsername) throw new UnauthorizedException('Username required');
    await this.adminService.validateAdmin(adminUsername);
    return this.adminService.updateUsername(parseInt(userId), body.newUsername);
  }

  // 2. Перегенерация ссылки устройства (удаляем из 3x-ui и создаем заново)
  @Post('devices/:deviceId/regenerate')
  async regenerateDeviceLink(
    @Headers('x-username') adminUsername: string,
    @Param('deviceId') deviceId: string
  ) {
    if (!adminUsername) throw new UnauthorizedException('Username required');
    await this.adminService.validateAdmin(adminUsername);
    return this.adminService.regenerateDeviceLink(parseInt(deviceId));
  }

  // 3. Добавление устройства админом (без списания баланса)
  @Post('users/:userId/devices')
  async addDeviceByAdmin(
    @Headers('x-username') adminUsername: string,
    @Param('userId') userId: string,
    @Body() body: { name: string, type: string }
  ) {
    if (!adminUsername) throw new UnauthorizedException('Username required');
    await this.adminService.validateAdmin(adminUsername);
    return this.adminService.addDeviceByAdmin(parseInt(userId), body);
  }
}