import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { XuiController } from './xui.controller';
import { XuiApiService } from './xui-api.service';

@Module({
  imports: [ConfigModule], // Добавь сюда
  controllers: [XuiController],
  providers: [XuiApiService],
  exports: [XuiApiService],
})
export class XuiModule {}