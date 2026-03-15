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
  async checkSubscriptionsAndNotify() {
    this.logger.log('🔄 Запуск ежедневной проверки подписок...');

    try {
      // Ищем все АКТИВНЫЕ устройства вместе с данными их владельцев
      const devices = await this.prisma.device.findMany({
        where: { isActive: true },
        include: { user: true },
      });

      const now = new Date();

      for (const device of devices) {
        if (!device.expiresAt) continue;

        const user = device.user;
        if (!user) continue;

        const timeDiff = device.expiresAt.getTime() - now.getTime();
        const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

        // Вытаскиваем имя и системный ID (clientXXuser)
        const deviceName = device.customName || device.name;
        const deviceIdentifier = device.email; 

        // 🚨 Отправляем уведомления в зависимости от остатка дней
        if (daysLeft === 3) {
          await this.botService.sendNotification(
            user.telegramId,
            `⚠️ <b>Внимание!</b>\n\nПодписка на VPN-устройство <b>"${deviceName}"</b> (<code>${deviceIdentifier}</code>) истекает через <b>3 дня</b>.\n\nЗайди в приложение и нажми "Продлить", чтобы не потерять доступ. 🌐`
          );
          this.logger.log(`Уведомление (3 дня) отправлено ${user.username} для ${deviceIdentifier}`);
          
        } else if (daysLeft === 1) {
          await this.botService.sendNotification(
            user.telegramId,
            `🚨 <b>Срочно!</b>\n\nЗавтра твой VPN <b>"${deviceName}"</b> (<code>${deviceIdentifier}</code>) будет отключен!\n\nПополни баланс и продли подписку прямо сейчас. 💳`
          );
          this.logger.log(`Уведомление (1 день) отправлено ${user.username} для ${deviceIdentifier}`);
          
        } else if (daysLeft <= 0) {
          // 1. Отключаем устройство в нашей базе данных
          await this.prisma.device.update({
            where: { id: device.id },
            data: { isActive: false },
          });

          // 2. Отправляем уведомление с указанием конкретной ссылки
          await this.botService.sendNotification(
            user.telegramId,
            `❌ <b>VPN отключен</b>\n\nСрок действия устройства <b>"${deviceName}"</b> (<code>${deviceIdentifier}</code>) подошел к концу.\n\nЗайди в приложение и продли подписку, чтобы ссылка снова заработала. 🔄`
          );
          this.logger.log(`Устройство ${deviceIdentifier} пользователя ${user.username} отключено (срок истек).`);
        }
      }
      this.logger.log('✅ Проверка подписок завершена.');
    } catch (error) {
      this.logger.error(`❌ Ошибка во время проверки подписок: ${(error as Error).message}`);
    }
  }
}