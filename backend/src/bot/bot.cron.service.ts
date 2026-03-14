import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BotService } from './bot.service';

@Injectable()
export class BotCronService {
  private readonly logger = new Logger(BotCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly botService: BotService,
  ) {}

  // Запускается каждый день ровно в 12:00 по серверному времени
  @Cron(CronExpression.EVERY_DAY_AT_NOON)
  async checkBalancesAndNotify() {
    this.logger.log('🔄 Запуск ежедневной проверки балансов...');

    try {
      // Ищем всех пользователей, у которых есть АКТИВНЫЕ устройства
      const users = await this.prisma.user.findMany({
        include: {
          devices: {
            where: { isActive: true },
          },
        },
      });

      for (const user of users) {
        // Если у пользователя нет активных устройств, пропускаем его
        if (user.devices.length === 0) continue;

        const dailyRate = user.devices.reduce((sum, d) => sum + (d.location === 'at' ? 5 : 10), 0);
        const balance = Number(user.balance);
        const daysLeft = Math.floor(balance / dailyRate);

        // 🚨 Отправляем уведомления в зависимости от остатка дней
        if (daysLeft === 3) {
          await this.botService.sendNotification(
            user.telegramId,
            `⚠️ <b>Внимание!</b>\n\nТвоего баланса (${balance} ₽) хватит ровно на <b>3 дня</b> работы VPN.\n\nПожалуйста, пополни счет, чтобы не потерять доступ к интернету. 🌐`
          );
          this.logger.log(`Уведомление (3 дня) отправлено пользователю ${user.username}`);
          
        } else if (daysLeft === 1) {
          await this.botService.sendNotification(
            user.telegramId,
            `🚨 <b>Срочно!</b>\n\nЗавтра твой VPN будет отключен за неуплату.\n\nПополни баланс прямо сейчас в нашем приложении! 💳`
          );
          this.logger.log(`Уведомление (1 день) отправлено пользователю ${user.username}`);
          
        } else if (daysLeft <= 0) {
          // Если баланс ушел в ноль или минус
          await this.botService.sendNotification(
            user.telegramId,
            `❌ <b>VPN отключен</b>\n\nНа твоем счету закончились средства. Доступ приостановлен.\n\nЧтобы снова пользоваться сервисом, просто пополни баланс, и устройства активируются автоматически. 🔄`
          );
          this.logger.log(`Уведомление (Отключен) отправлено пользователю ${user.username}`);
          
          // 🔥 БОНУС: Здесь ты можешь сразу выключить устройства в базе!
          /*
          await this.prisma.device.updateMany({
            where: { userId: user.id, isActive: true },
            data: { isActive: false },
          });
          // И добавить логику отправки запроса в 3x-ui на отключение клиента...
          */
        }
      }
      this.logger.log('✅ Проверка балансов завершена.');
    } catch (error) {
      this.logger.error(`❌ Ошибка во время проверки балансов: ${(error as Error).message}`);
    }
  }
}