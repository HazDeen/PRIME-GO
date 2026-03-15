import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async validateUser(username: string, password: string) {
    console.log(`🔍 Validating user @${username}`);
    
    const user = await this.prisma.user.findFirst({
      where: { 
        username: {
          equals: username,
          mode: 'insensitive',
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    if (!user.password) {
      throw new UnauthorizedException('Пароль не установлен. Напишите /setpass в боте');
    }

    // Проверяем пароль
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный пароль');
    }

    return user;
  }

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      telegramId: Number(user.telegramId),
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      balance: user.balance,
      isAdmin: user.isAdmin,
      avatarUrl: user.avatarUrl,
    };
  }
}