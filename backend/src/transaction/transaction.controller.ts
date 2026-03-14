import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { TransactionService } from './transaction.service';

@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get()
  async getUserTransactions(@Headers('x-username') username: string) {
    if (!username) throw new UnauthorizedException('Username required');
    return this.transactionService.getUserTransactionsByUsername(username);
  }
}