import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from './guards/admin.guard';
import { XuiModule } from '../xui/xui.module';
import { BotModule } from '../bot/bot.module';

@Module({
  imports: [XuiModule, BotModule],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
  exports: [AdminService],
})
export class AdminModule {}