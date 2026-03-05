import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DeviceService } from './device.service';
import { DeviceCronService } from './device-cron.service';
import { DeviceController } from './device.controller';
import { XuiApiService } from '../xui/xui-api.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ScheduleModule.forRoot(), ConfigModule],
  controllers: [DeviceController],
  providers: [DeviceService, XuiApiService, PrismaService, DeviceCronService],
  exports: [DeviceService],
})
export class DeviceModule {}