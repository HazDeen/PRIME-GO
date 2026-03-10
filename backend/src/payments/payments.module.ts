import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaService } from '../prisma/prisma.service'; // 👈 Проверь правильность пути
import { BotService } from '../bot/bot.service'; // 👈 Проверь правильность пути

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PrismaService, BotService],
})
export class PaymentsModule {}