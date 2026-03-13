import { Controller, Get, Post, Body, Put, Param, Patch, Headers, UnauthorizedException } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('balance')
  async getBalance(@Headers('x-username') username: string) {
    if (!username) throw new UnauthorizedException('Username required');
    return this.userService.getBalanceByUsername(username);
  }

  @Get('profile')
  async getProfile(@Headers('x-username') username: string) {
    if (!username) throw new UnauthorizedException('Username required');
    return this.userService.getProfileByUsername(username);
  }

  @Post('topup')
  async topUp(
    @Headers('x-username') username: string,
    @Body() body: { amount: number }
  ) {
    if (!username) throw new UnauthorizedException('Username required');
    return this.userService.topUpBalanceByUsername(username, body.amount);
  }

  // 🌟 Обновить настройки пользователя (Тумблеры)
  @Put(':tgId/settings')
  async updateSettings(@Param('tgId') tgId: string, @Body() body: any) {
    return prisma.user.update({
      where: { telegramId: BigInt(tgId) },
      data: body,
    });
  }

  // 🌟 Получить уведомления пользователя
  @Get(':tgId/notifications')
  async getNotifications(@Param('tgId') tgId: string) {
    const user = await prisma.user.findUnique({ where: { telegramId: BigInt(tgId) } });
    if (!user) return [];
    
    return prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
  }

  // 🌟 Пометить уведомления как прочитанные
  @Post(':tgId/notifications/read')
  async markNotificationsRead(@Param('tgId') tgId: string) {
    const user = await prisma.user.findUnique({ where: { telegramId: BigInt(tgId) } });
    if (!user) return { success: false };

    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true }
    });
    return { success: true };
  }

  @Patch('username')
  async updateUsername(
    @Body() body: { telegramId: string | number; username: string }
  ) {
    try {
      const updatedUser = await prisma.user.update({
        where: { telegramId: BigInt(body.telegramId) },
        data: { username: body.username },
      });
      
      return { 
        success: true, 
        user: {
          ...updatedUser,
          telegramId: updatedUser.telegramId.toString() // BigInt нельзя просто так вернуть в JSON
        } 
      };
    } catch (error) {
      return { success: false, error: 'Не удалось обновить имя' };
    }
  }
}