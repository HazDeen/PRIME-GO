import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { PrismaService } from '../prisma/prisma.service';
import { BotModule } from '../bot/bot.module';

@Module({
  imports: [BotModule],
  providers: [TicketsService, PrismaService],
  controllers: [TicketsController]
})
export class TicketsModule {}
