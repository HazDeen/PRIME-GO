import { Controller, Get, Post, Body, Put, Param, Patch, Headers, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt'; // 👈 Добавили импорт bcrypt для паролей

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

  @Put(':tgId/settings')
  async updateSettings(@Param('tgId') tgId: string, @Body() body: any) {
    return prisma.user.update({
      where: { telegramId: BigInt(tgId) },
      data: body,
    });
  }

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

  // 🌟 ИЗМЕНЕНИЕ ЛОГИНА (USERNAME)
  @Patch('username')
  async updateUsername(
    @Headers('x-username') currentUsername: string,
    @Body() body: { newUsername: string }
  ) {
    if (!currentUsername) throw new UnauthorizedException('Username required');
    if (!body.newUsername) throw new BadRequestException('New username is required');

    // 1. Проверяем, не занят ли новый логин кем-то другим
    const existingUser = await prisma.user.findFirst({ 
      where: { username: { equals: body.newUsername, mode: 'insensitive' } } 
    });
    if (existingUser && existingUser.username !== currentUsername) {
      throw new BadRequestException('Этот логин уже занят');
    }

    // 2. Ищем текущего пользователя
    const user = await prisma.user.findFirst({ 
      where: { username: { equals: currentUsername, mode: 'insensitive' } } 
    });
    if (!user) throw new UnauthorizedException('User not found');

    // 3. Обновляем логин в БД
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { username: body.newUsername },
    });
    
    return { 
      success: true, 
      user: {
        ...updatedUser,
        telegramId: updatedUser.telegramId.toString() 
      } 
    };
  }

  // 🌟 ИЗМЕНЕНИЕ ПАРОЛЯ
  @Put('password')
  async updatePassword(
    @Headers('x-username') username: string,
    @Body() body: { oldPassword: string, newPassword: string }
  ) {
    if (!username) throw new UnauthorizedException('Username required');
    
    const user = await prisma.user.findFirst({ 
      where: { username: { equals: username, mode: 'insensitive' } } 
    });
    if (!user) throw new UnauthorizedException('User not found');
    if (!user.password) throw new BadRequestException('Пароль не установлен');

    // 1. Проверяем старый пароль (сравниваем хэши)
    const isMatch = await bcrypt.compare(body.oldPassword, user.password);
    if (!isMatch) throw new BadRequestException('Неверный текущий пароль');

    // 2. Хэшируем новый пароль так же, как в bot.service.ts
    const hashedNewPassword = await bcrypt.hash(body.newPassword, 10);

    // 3. Сохраняем в БД
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedNewPassword }
    });

    return { success: true, message: 'Пароль обновлен' };
  }

  // 🌟 ОБНОВЛЕНИЕ АВАТАРКИ
  @Put('avatar')
  async updateAvatar(
    @Headers('x-username') username: string,
    @Body() body: { avatarBase64: string }
  ) {
    if (!username) throw new UnauthorizedException('Username required');
    
    const user = await prisma.user.findFirst({ 
      where: { username: { equals: username, mode: 'insensitive' } } 
    });
    if (!user) throw new UnauthorizedException('User not found');

    await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: body.avatarBase64 }
    });

    return { success: true, message: 'Аватарка обновлена' };
  }
}