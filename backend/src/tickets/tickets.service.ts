import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; 

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  // 🔥 Вспомогательная функция для отправки сообщений в ТГ
  private async sendTelegramMessage(chatId: string | bigint, text: string) {
    const token = process.env.BOT_TOKEN;
    if (!token) {
      console.warn('BOT_TOKEN не задан в .env!');
      return;
    }
    
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: chatId.toString(), 
          text: text, 
          parse_mode: 'HTML' // Позволяет использовать <b>жирный текст</b>
        })
      });
    } catch (err) {
      console.error(`Ошибка отправки ТГ сообщения юзеру ${chatId}:`, err);
    }
  }

  // 1. Создать новый тикет + Уведомление админам
  async createTicket(data: { userId: string; topic: string; text: string }) {
    const ticket = await this.prisma.ticket.create({
      data: {
        userId: BigInt(data.userId),
        topic: data.topic,
        messages: {
          create: {
            text: data.text,
            isAdmin: false,
          },
        },
      },
      include: { messages: true },
    });

    // 🔥 РАССЫЛКА АДМИНАМ 🔥
    try {
      // Ищем всех админов в базе
      const admins = await this.prisma.user.findMany({ 
        where: { isAdmin: true } 
      });

      const messageText = `🚨 <b>Новый тикет!</b>\n\n<b>От:</b> <code>${data.userId}</code>\n<b>Тема:</b> ${data.topic}\n<b>Суть:</b> ${data.text}\n\n<a href="https://hazdeen.github.io/VPN/#/admin/tickets">Перейти в панель тикетов</a>`;

      // Отправляем каждому админу сообщение
      for (const admin of admins) {
        await this.sendTelegramMessage(admin.telegramId, messageText);
      }
    } catch (error) {
      console.error('Ошибка при рассылке админам о тикете:', error);
    }

    return { ...ticket, userId: ticket.userId.toString() };
  }

  // 2. Получить список всех тикетов юзера
  async getUserTickets(userId: string) {
    const tickets = await this.prisma.ticket.findMany({
      where: { userId: BigInt(userId) },
      orderBy: { updatedAt: 'desc' },
    });
    return tickets.map(t => ({ ...t, userId: t.userId.toString() }));
  }

  // 3. Открыть конкретный тикет
  async getTicketById(id: number) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!ticket) return null;
    return { ...ticket, userId: ticket.userId.toString() };
  }

  // 4. Отправить новое сообщение в тикет
  async addMessage(ticketId: number, text: string, isAdmin: boolean) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { status: true } 
    });

    if (!ticket) throw new BadRequestException('Тикет не найден');
    if (ticket.status === 'CLOSED') throw new BadRequestException('Нельзя писать в закрытый тикет');

    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: isAdmin ? 'ANSWERED' : 'OPEN', 
        messages: { create: { text, isAdmin } },
      },
      include: { messages: true },
    });
  }

  // 5. Закрыть тикет
  async closeTicket(id: number) {
    return this.prisma.ticket.update({
      where: { id },
      data: { status: 'CLOSED' },
    });
  }

  // 6. Получить все тикеты для АДМИНКИ
  async getAdminTickets(topic?: string, status?: string, userId?: string) {
    const where: any = {};
    if (topic) where.topic = topic;
    if (status) where.status = status;
    if (userId) where.userId = BigInt(userId);

    const tickets = await this.prisma.ticket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return tickets.map(t => ({ ...t, userId: t.userId.toString() }));
  }
}