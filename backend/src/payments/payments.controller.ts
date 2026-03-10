import { Controller, Post, Body, Headers, UnauthorizedException, HttpCode } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create')
  async createPayment(
    @Headers('x-telegram-id') telegramId: string,
    @Body() body: { amount: number }
  ) {
    if (!telegramId) throw new UnauthorizedException();
    if (body.amount < 50) throw new Error('Минимальная сумма 50 руб.');
    
    return this.paymentsService.createPaymentUrl(telegramId, body.amount);
  }

  @Post('webhook/cryptobot')
  @HttpCode(200) // Важно: CryptoBot требует код 200, иначе будет слать запросы бесконечно
  async cryptobotWebhook(@Body() body: any) {
    if (body.update_type === 'invoice_paid') {
      const orderId = body.payload.payload; 
      await this.paymentsService.processSuccessfulPayment(orderId);
    }
    return 'OK'; 
  }
}