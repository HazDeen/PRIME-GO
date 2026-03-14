import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(private prisma: PrismaService) {}

  private async findUserByUsername(username: string) {
    const user = await this.prisma.user.findFirst({
      where: { 
        username: {
          equals: username,
          mode: 'insensitive',
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User @${username} not found`);
    }

    return user;
  }

  async getUserTransactions(userId: number) {
    this.logger.log(`📜 Getting transactions for user ${userId}`);
    
    const transactions = await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const grouped = {};
    
    transactions.forEach((t) => {
      const date = t.createdAt.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).toUpperCase();

      if (!grouped[date]) {
        grouped[date] = [];
      }

      grouped[date].push({
        id: t.id,
        time: t.createdAt.toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        description: t.description,
        amount: t.amount,
        type: t.type,
      });
    });

    return grouped;
  }

  async getUserTransactionsByUsername(username: string) {
    const user = await this.findUserByUsername(username);
    return this.getUserTransactions(user.id);
  }
}