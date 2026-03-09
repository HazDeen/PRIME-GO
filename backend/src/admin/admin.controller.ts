import { Controller, Get, Put, Post, Delete, Param, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

  @Get('devices')
  async getAllDevices(@Headers('x-username') username: string) {
    if (!username) throw new UnauthorizedException('Username required');
    await this.adminService.validateAdmin(username);
    return this.adminService.getAllDevices();
  }

  @Delete('devices/:deviceId')
  async deleteDevice(
    @Headers('x-username') username: string,
    @Param('deviceId') deviceId: string
  ) {
    if (!username) throw new UnauthorizedException('Username required');
    await this.adminService.validateAdmin(username);
    return this.adminService.deleteDevice(parseInt(deviceId));
  }

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

  @Post('devices/:deviceId/regenerate')
  async regenerateDeviceLink(
    @Headers('x-username') adminUsername: string,
    @Param('deviceId') deviceId: string
  ) {
    if (!adminUsername) throw new UnauthorizedException('Username required');
    await this.adminService.validateAdmin(adminUsername);
    return this.adminService.regenerateDeviceLink(parseInt(deviceId));
  }

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

  // ==========================================
  // 🚨 НОВЫЕ РОУТЫ ДЛЯ ТУМБЛЕРОВ БЕЗОПАСНОСТИ
  // ==========================================
  
  @Get('settings')
  async getSettings(@Headers('x-username') adminUsername: string) {
    if (!adminUsername) throw new UnauthorizedException('Username required');
    await this.adminService.validateAdmin(adminUsername);

    let settings = await prisma.settings.findFirst();
    
    if (!settings) {
      settings = await prisma.settings.create({
        data: { blockAll: false, blockUsers: false, blockAdmins: false }
      });
    }

    return {
      all: settings.blockAll,
      users: settings.blockUsers,
      admins: settings.blockAdmins
    };
  }

  @Put('settings')
  async updateSettings(
    @Headers('x-username') adminUsername: string,
    @Body() body: { all: boolean, users: boolean, admins: boolean }
  ) {
    if (!adminUsername) throw new UnauthorizedException('Username required');
    await this.adminService.validateAdmin(adminUsername);

    let settings = await prisma.settings.findFirst();
    
    if (settings) {
      settings = await prisma.settings.update({
        where: { id: settings.id },
        data: { blockAll: body.all, blockUsers: body.users, blockAdmins: body.admins }
      });
    } else {
      settings = await prisma.settings.create({
        data: { blockAll: body.all, blockUsers: body.users, blockAdmins: body.admins }
      });
    }

    return {
      all: settings.blockAll,
      users: settings.blockUsers,
      admins: settings.blockAdmins
    };
  }
}