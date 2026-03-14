import { Controller, Get, Post, Body, Param, Query, Patch } from '@nestjs/common';
import { TicketsService } from './tickets.service';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // POST /tickets -> Создать тикет
  @Post()
  createTicket(@Body() body: { userId: string; topic: string; text: string }) {
    return this.ticketsService.createTicket(body);
  }

  // GET /tickets/user/123456789 -> Получить тикеты юзера
  @Get('user/:userId')
  getUserTickets(@Param('userId') userId: string) {
    return this.ticketsService.getUserTickets(userId);
  }

  // GET /tickets/admin/all?topic=Оплата&status=OPEN -> Админский список с фильтрами
  @Get('admin/all')
  getAdminTickets(
    @Query('topic') topic?: string,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
  ) {
    return this.ticketsService.getAdminTickets(topic, status, userId);
  }

  // GET /tickets/5 -> Открыть сам чат тикета (и юзеру, и админу)
  @Get(':id')
  getTicketById(@Param('id') id: string) {
    return this.ticketsService.getTicketById(Number(id));
  }

  // POST /tickets/5/message -> Отправить сообщение в чат
  @Post(':id/message')
  addMessage(
    @Param('id') id: string,
    @Body() body: { text: string; isAdmin: boolean },
  ) {
    return this.ticketsService.addMessage(Number(id), body.text, body.isAdmin);
  }

  // Patch /tickets/5/close -> Закрыть тикет
  @Patch(':id/close')
  closeTicket(@Param('id') id: string) {
    return this.ticketsService.closeTicket(Number(id));
  }
}