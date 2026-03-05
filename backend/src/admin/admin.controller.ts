import { Controller, Get, Put, Delete, Param, Body, Headers, UnauthorizedException } from '@nestjs/common';
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
}