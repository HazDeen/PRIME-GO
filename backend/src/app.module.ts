import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { DeviceModule } from './device/device.module';
import { AuthModule } from './auth/auth.module';
import { TransactionModule } from './transaction/transaction.module';
import { LoggerModule } from './logger/logger.module';
import { BotModule } from './bot/bot.module';
import { AdminModule } from './admin/admin.module';
import { XuiModule } from './xui/xui.module';
import { TicketsModule } from './tickets/tickets.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    UserModule,
    DeviceModule,
    AuthModule,
    TransactionModule,
    LoggerModule,
    BotModule,
    AdminModule,
    XuiModule,
    TicketsModule,
  ],
})
export class AppModule {}