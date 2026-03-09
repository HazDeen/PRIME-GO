import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Telegraf, Markup } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private bot: Telegraf;
  private readonly logger = new Logger(BotService.name);
  
  // Храним состояние: ждем ли мы пароль от пользователя
  private waitingForPassword = new Map<number, 'set' | 'reset'>();

  constructor(private prisma: PrismaService) {
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) {
      throw new Error('❌ BOT_TOKEN не настроен в .env');
    }
    this.bot = new Telegraf(botToken);
  }

  async onApplicationShutdown(signal?: string) {
    this.logger.log(`Остановка Telegraf бота... Сигнал: ${signal}`);
    this.bot.stop(signal);
  }

  async onModuleInit() {
    try {
      this.logger.log('🚀 Бот запускается...');

      const botInfo = await this.bot.telegram.getMe();
      this.logger.log(`✅ Бот авторизован: @${botInfo.username}`);

      await this.bot.telegram.deleteWebhook({ drop_pending_updates: true });
      
      this.registerCommands();
      this.registerActions(); // Регистрируем обработчики кнопок

      this.bot.launch({ dropPendingUpdates: true })
        .then(() => this.logger.log('✅ Бот успешно запущен!'))
        .catch((err) => this.logger.error(`❌ Ошибка запуска бота: ${err.message}`));
      
    } catch (error) {
      this.logger.error(`❌ Критическая ошибка: ${(error as Error).message}`);
    }
  }

  // ==========================================
  // ПУБЛИЧНЫЙ МЕТОД ДЛЯ ОТПРАВКИ УВЕДОМЛЕНИЙ
  // ==========================================
  public async sendNotification(telegramId: number | bigint | string, message: string) {
    try {
      // Здесь можно добавить проверку: если user.notificationsEnabled === false, то делать return
      await this.bot.telegram.sendMessage(telegramId.toString(), message, { parse_mode: 'HTML' });
      this.logger.log(`Уведомление отправлено пользователю ${telegramId}`);
    } catch (error) {
      this.logger.error(`Ошибка отправки уведомления ${telegramId}: ${(error as Error).message}`);
    }
  }

  // ==========================================
  // ГЕНЕРАТОР ГЛАВНОГО МЕНЮ
  // ==========================================
  private async getMainMenu(telegramId: number) {
    const user = await this.prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
    });

    if (!user) return { text: '❌ Ошибка. Напиши /start', keyboard: null };

    const text = `🌟 <b>PRIME GO СЕРВИСЫ</b> 🌟\n\n👤 Привет, <b>${user.firstName}</b>!\n💰 Баланс: <b>${user.balance} ₽</b>\n\n👇 Выбери нужное действие:`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.webApp('🚀 Открыть PRIME GO', 'https://hazdeen.github.io/VPN/')],
      [
        Markup.button.callback('📱 Мои устройства', 'menu_devices'),
        Markup.button.callback('💰 Пополнить баланс', 'menu_topup')
      ],
      [
        Markup.button.callback('🔐 Управление паролем', 'menu_password'),
        Markup.button.callback('🆘 Поддержка', 'menu_support')
      ],
      ...(user.isAdmin ? [[Markup.button.callback('⚙️ Админ-панель', 'menu_admin')]] : [])
    ]);

    return { text, keyboard };
  }

  private registerCommands() {
    this.bot.command('start', async (ctx) => {
      try {
        const telegramId = ctx.from.id;
        const firstName = ctx.from.first_name || '';
        const lastName = ctx.from.last_name || '';
        const username = ctx.from.username || '';

        await this.prisma.user.upsert({
          where: { telegramId: BigInt(telegramId) },
          update: { firstName, lastName, username },
          create: {
            telegramId: BigInt(telegramId),
            firstName, lastName, username,
            balance: 0, isAdmin: false,
          },
        });

        const menu = await this.getMainMenu(telegramId);
        await ctx.reply(menu.text, { ...menu.keyboard, parse_mode: 'HTML' });
        
      } catch (error) {
        this.logger.error(`❌ Ошибка /start: ${(error as Error).message}`);
      }
    });

    // Оставляем команду для тех, кто любит писать руками
    this.bot.command('menu', async (ctx) => {
      const menu = await this.getMainMenu(ctx.from.id);
      if (menu.keyboard) await ctx.reply(menu.text, { ...menu.keyboard, parse_mode: 'HTML' });
    });

    // Обработка ввода пароля (текст от пользователя)
    this.bot.on('text', async (ctx) => {
      const telegramId = ctx.from.id;
      const text = ctx.message.text;

      if (!this.waitingForPassword.has(telegramId)) return;

      const action = this.waitingForPassword.get(telegramId);
      
      try {
        const hashedPassword = await bcrypt.hash(text, 10);
        await this.prisma.user.update({
          where: { telegramId: BigInt(telegramId) },
          data: { password: hashedPassword },
        });

        // Удаляем сообщение с паролем для безопасности (чтобы не висело в чате)
        try { await ctx.deleteMessage(); } catch (e) {}

        const msg = action === 'set' ? '✅ Пароль успешно установлен!' : '✅ Пароль успешно изменён!';
        
        const menu = await this.getMainMenu(telegramId);
        await ctx.reply(`${msg}\n\n${menu.text}`, { ...menu.keyboard, parse_mode: 'HTML' });

        this.waitingForPassword.delete(telegramId);
      } catch (error) {
        await ctx.reply('⚠️ Ошибка. Попробуй позже.');
        this.waitingForPassword.delete(telegramId);
      }
    });
  }

  // ==========================================
  // ОБРАБОТЧИКИ НАЖАТИЙ НА КНОПКИ (ACTIONS)
  // ==========================================
  private registerActions() {
    this.bot.action('menu_password', async (ctx) => {
      const telegramId = ctx.from.id;
      
      const user = await this.prisma.user.findUnique({
        where: { telegramId: BigInt(telegramId) },
      });

      this.waitingForPassword.set(telegramId, user?.password ? 'reset' : 'set');
      
      await ctx.editMessageText(
        '🔐 <b>Управление паролем</b>\n\nОтправь мне новый пароль ответным сообщением.\n<i>(Он будет зашифрован и скрыт из чата)</i>',
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'menu_main')]])
        }
      );
      await ctx.answerCbQuery(); // Убираем часики загрузки на кнопке
    });

    this.bot.action('menu_devices', async (ctx) => {
      await ctx.answerCbQuery('Тут будет список конфигов!', { show_alert: true });
      // Позже здесь сделаешь запрос в БД для получения активных устройств и выведешь их текстом
    });

    this.bot.action('menu_topup', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.editMessageText(
        '💳 <b>Пополнение баланса</b>\n\nПополнить счет можно внутри нашего Mini App!',
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [Markup.button.webApp('🚀 Открыть приложение', 'https://hazdeen.github.io/VPN/')],
            [Markup.button.callback('🔙 Назад', 'menu_main')]
          ])
        }
      );
    });

    this.bot.action('menu_support', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.editMessageText(
        '🆘 <b>Служба поддержки</b>\n\nЕсли у вас возникли проблемы, напишите нашему администратору.',
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [Markup.button.url('✉️ Написать админу', 'https://t.me/HazDeen')], // Замени на свой тег
            [Markup.button.callback('🔙 Назад', 'menu_main')]
          ])
        }
      );
    });

    this.bot.action('menu_admin', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.editMessageText(
        '⚙️ <b>Админ-панель</b>\n\nУправление проектом доступно по ссылке ниже:',
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [Markup.button.url('Отрыть панель (Web)', 'https://hazdeen.github.io/VPN/#/admin')],
            [Markup.button.callback('🔙 Назад', 'menu_main')]
          ])
        }
      );
    });

    // Возврат в главное меню
    this.bot.action('menu_main', async (ctx) => {
      const menu = await this.getMainMenu(ctx.from.id);
      if (menu.keyboard) {
        await ctx.editMessageText(menu.text, { ...menu.keyboard, parse_mode: 'HTML' });
      }
      this.waitingForPassword.delete(ctx.from.id); // Отменяем ожидание пароля, если нажали Назад
      await ctx.answerCbQuery();
    });
  }

  async onModuleDestroy() {
    this.logger.log('🛑 Останавливаем бота...');
    this.bot.stop();
  }
}