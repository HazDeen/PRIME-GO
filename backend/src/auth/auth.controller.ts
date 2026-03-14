import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    console.log(`📥 Login attempt with username: ${body.username}`);
    
    if (!body.username || !body.password) {
      throw new UnauthorizedException('Username and password required');
    }
    
    const user = await this.authService.validateUser(body.username, body.password);
    
    return {
      success: true,
      user: {
        id: user.id,
        telegramId: Number(user.telegramId),
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        balance: user.balance,
        isAdmin: user.isAdmin,
      },
    };
  }
}