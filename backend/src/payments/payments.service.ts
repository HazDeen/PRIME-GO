import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BotService } from '../bot/bot.service';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private botService: BotService
  ) {}

  // 1. Создание счета в CryptoBot
  async createPaymentUrl(telegramId: string, amount: number) {
    const orderId = `ORDER_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const user = await this.prisma.user.findFirst({
      where: { telegramId: BigInt(telegramId) }
    });
    
    if (!user) throw new BadRequestException('Пользователь не найден');

    // Сохраняем платеж в ожидании
    await this.prisma.payment.create({
      data: { userId: user.id, amount, orderId, status: 'PENDING', provider: 'Bot' }
    });

    const token = process.env.CRYPTOBOT_TOKEN;
    if (!token) throw new Error('В .env не указан CRYPTOBOT_TOKEN');

    // Запрос к CryptoBot API
    const response = await fetch('https://testnet-pay.crypt.bot/api/createInvoice', {
      method: 'POST',
      headers: {
        'Crypto-Pay-API-Token': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        currency_type: 'fiat', // Позволяет юзеру ввести рубли, а списать крипту по курсу
        fiat: 'RUB',
        amount: amount.toString(),
        description: 'Пополнение баланса Prime',
        payload: orderId // Прячем сюда наш номер заказа
      })
    });

    const data = await response.json();
    if (!data.ok) throw new Error('Ошибка от CryptoBot: ' + JSON.stringify(data));
    
    return { url: data.result.pay_url };
  }

  // 2. Успешное пополнение баланса (Webhook)
  async processSuccessfulPayment(orderId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { orderId } });
    
    if (!payment) return false;
    if (payment.status === 'SUCCESS') return true; 

    // Отмечаем как оплаченный
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'SUCCESS' }
    });

    // Даем деньги пользователю
    const user = await this.prisma.user.update({
      where: { id: payment.userId },
      data: { balance: { increment: payment.amount } }
    });

    // Радуем в Телеграме
    await this.botService.sendNotification(
      user.telegramId,
      `💰 <b>Баланс пополнен!</b>\n\nСумма: <b>${payment.amount} ₽</b>\nТекущий баланс: ${user.balance} ₽`
    );

    return true;
  }
}