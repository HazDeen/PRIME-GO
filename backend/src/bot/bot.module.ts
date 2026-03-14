import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { BotCronService } from './bot.cron.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [BotService, BotCronService],
  exports: [BotService],
})
export class BotModule {}