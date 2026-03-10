import { Controller, Get, Put, Post, Delete, Param, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // 🔥 Вспомогательная функция для отправки сообщений в ТГ
  private async sendTelegramMessage(chatId: string | number | bigint, text: string) {
    const token = process.env.BOT_TOKEN;
    if (!token) {
      console.warn('BOT_TOKEN не задан в .env!');
      return;
    }
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: chatId.toString(), 
          text: text, 
          parse_mode: 'HTML' 
        })
      });
    } catch (err) {
      console.error(`Ошибка отправки ТГ сообщения юзеру ${chatId}:`, err);
    }
  }

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
  // РОУТЫ ДЛЯ ТУМБЛЕРОВ БЕЗОПАСНОСТИ
  // ==========================================
  
  @Get('settings')
  async getSettings(@Headers('x-username') adminUsername: string) {
    if (!adminUsername) throw new UnauthorizedException('Username required');
    await this.adminService.validateAdmin(adminUsername);

    let settings = await prisma.settings.findFirst();
    
    if (!settings) {
      settings = await prisma.settings.create({
        data: { 
          blockAll: false, 
          blockUsers: false, 
          blockAdmins: false, 
          maintenanceMode: false 
        }
      });
    }

    return {
      all: settings.blockAll,
      users: settings.blockUsers,
      admins: settings.blockAdmins,
      maintenance: settings.maintenanceMode 
    };
  }

  @Put('settings')
  async updateSettings(
    @Headers('x-username') adminUsername: string,
    @Body() body: { all: boolean, users: boolean, admins: boolean, maintenance: boolean }
  ) {
    if (!adminUsername) throw new UnauthorizedException('Username required');
    await this.adminService.validateAdmin(adminUsername);

    let settings = await prisma.settings.findFirst();
    
    // Проверяем прошлые состояния
    const wasMaintenanceOff = settings ? !settings.maintenanceMode : true;
    
    // Флаги изменений
    const isTurningMaintenanceOn = body.maintenance === true && wasMaintenanceOff;
    const isTurningMaintenanceOff = body.maintenance === false && !wasMaintenanceOff; // 👈 Новый флаг окончания работ

    if (settings) {
      settings = await prisma.settings.update({
        where: { id: settings.id },
        data: { 
          blockAll: body.all, 
          blockUsers: body.users, 
          blockAdmins: body.admins,
          maintenanceMode: body.maintenance 
        }
      });
    } else {
      settings = await prisma.settings.create({
        data: { 
          blockAll: body.all, 
          blockUsers: body.users, 
          blockAdmins: body.admins,
          maintenanceMode: body.maintenance 
        }
      });
    }

    // 🔥 РАССЫЛКА ПОЛЬЗОВАТЕЛЯМ 🔥
    if (isTurningMaintenanceOn) {
      try {
        const users = await prisma.user.findMany();
        const messageText = `⚙️ <b>Технические работы</b>\n\nВ данный момент на серверах VPN проводятся технические работы для улучшения качества связи.\n\nНекоторые функции приложения могут быть временно недоступны. Приносим извинения за временные неудобства!`;
        
        users.forEach(user => {
          this.sendTelegramMessage(user.telegramId, messageText);
        });
      } catch (error) {
        console.error('Ошибка при рассылке о начале тех. работ:', error);
      }
    } else if (isTurningMaintenanceOff) {
      // 👈 НОВАЯ ЛОГИКА: Рассылка об окончании
      try {
        const users = await prisma.user.findMany();
        const messageText = `✅ <b>Технические работы завершены!</b>\n\nВсе сервисы VPN снова работают в штатном режиме.\n\nСпасибо за ваше терпение! Приятного пользования.`;
        
        users.forEach(user => {
          this.sendTelegramMessage(user.telegramId, messageText);
        });
      } catch (error) {
        console.error('Ошибка при рассылке об окончании тех. работ:', error);
      }
    }

    return {
      all: settings.blockAll,
      users: settings.blockUsers,
      admins: settings.blockAdmins,
      maintenance: settings.maintenanceMode 
    };
  }

  @Get('status')
  async getSystemStatus() {
    let settings = await prisma.settings.findFirst();
    if (!settings) {
      settings = await prisma.settings.create({
        data: { blockAll: false, blockUsers: false, blockAdmins: false, maintenanceMode: false }
      });
    }
    return { maintenance: settings.maintenanceMode };
  }
}