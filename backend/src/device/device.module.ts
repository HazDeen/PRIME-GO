import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DeviceService } from './device.service';
import { DeviceCronService } from './device-cron.service';
import { DeviceController } from './device.controller';
import { XuiApiService } from '../xui/xui-api.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [DeviceController],
  providers: [DeviceService, XuiApiService, PrismaService, DeviceCronService],
  exports: [DeviceService],
})
export class DeviceModule {}