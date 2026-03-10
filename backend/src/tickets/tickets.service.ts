import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Проверь правильность пути до твоего PrismaService

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  // 1. Создать новый тикет + сразу добавить в него первое сообщение от юзера
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

    return { ...ticket, userId: ticket.userId.toString() };
  }

  // 2. Получить список всех тикетов конкретного юзера (для его личного кабинета)
  async getUserTickets(userId: string) {
    const tickets = await this.prisma.ticket.findMany({
      where: { userId: BigInt(userId) },
      orderBy: { updatedAt: 'desc' }, // Сначала самые новые/обновленные
    });
    
    return tickets.map(t => ({ ...t, userId: t.userId.toString() }));
  }

  // 3. Открыть конкретный тикет (загрузить чат)
  async getTicketById(id: number) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } }, // Сообщения по порядку времени
      },
    });
    
    if (!ticket) return null;
    return { ...ticket, userId: ticket.userId.toString() };
  }

  // 4. Отправить новое сообщение в тикет
  async addMessage(ticketId: number, text: string, isAdmin: boolean) {
    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        // Если ответил админ -> статус ANSWERED, если юзер -> OPEN
        status: isAdmin ? 'ANSWERED' : 'OPEN', 
        messages: {
          create: { text, isAdmin },
        },
      },
      include: { messages: true },
    });
  }

  // 5. Закрыть тикет (Вопрос решен)
  async closeTicket(id: number) {
    return this.prisma.ticket.update({
      where: { id },
      data: { status: 'CLOSED' },
    });
  }

  // 6. Получить все тикеты для АДМИНКИ (с поддержкой фильтров)
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