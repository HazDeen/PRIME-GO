import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'vpn-backend',
      timestamp: new Date().toISOString()
    };
  }
}