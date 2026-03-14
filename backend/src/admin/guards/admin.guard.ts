import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Получаем username из запроса (например, из заголовка или тела)
    // В реальности пользователь должен быть уже авторизован через login-by-username
    const username = request.headers['x-username'] || request.body?.username;

    if (!username) {
      throw new UnauthorizedException('Username required');
    }

    // Ищем пользователя в БД
    const user = await this.prisma.user.findFirst({
      where: { 
        username: {
          equals: username,
          mode: 'insensitive',
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isAdmin) {
      throw new UnauthorizedException('Admin access required');
    }

    // Добавляем пользователя в request для дальнейшего использования
    request.user = {
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
    };

    return true;
  }
}