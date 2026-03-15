import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { BotCronService } from './bot.cron.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SupportBotService } from './support-bot.service';

@Module({
  imports: [PrismaModule],
  providers: [BotService, BotCronService, SupportBotService],
  exports: [BotService],
})
export class BotModule {}