import { Injectable, OnModuleInit, BeforeApplicationShutdown, Logger } from '@nestjs/common';
import { Telegraf, Markup } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

// Твоя ссылка на GitHub Pages
const API_URL = 'https://hazdeen.github.io/PRIME-GO/';

@Injectable()
export class BotService implements OnModuleInit, BeforeApplicationShutdown {
  private bot: Telegraf;
  private readonly logger = new Logger(BotService.name);
  
  // Храним состояние: ждем ли мы пароль от пользователя
  private waitingForPassword = new Map<number, 'set' | 'reset'>();

  constructor(private prisma: PrismaService) {
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) throw new Error('❌ BOT_TOKEN не настроен в .env');
    this.bot = new Telegraf(botToken);
  }

  async beforeApplicationShutdown(signal?: string) {
    this.logger.warn(`🛑 Получен сигнал ${signal}. Экстренно отключаем бота от Telegram...`);
    try {
      this.bot.stop(signal);
      this.logger.log('✅ Бот успешно отключен.');
    } catch (e) {
      this.logger.error('Ошибка при остановке бота', e);
    }
  }

  async onModuleInit() {
    try {
      this.logger.log('🚀 Бот запускается (Mini App Edition)...');

      await this.bot.telegram.deleteWebhook({ drop_pending_updates: true });
      
      const botInfo = await this.bot.telegram.getMe();
      this.logger.log(`✅ Бот авторизован: @${botInfo.username}`);
      
      this.registerCommands();
      this.registerActions();

      // 🌟 МАГИЯ ЗДЕСЬ: Устанавливаем кнопку "PRIME GO" слева от поля ввода текста!
      await this.bot.telegram.setChatMenuButton({
        menuButton: {
          type: 'web_app',
          text: '🚀 PRIME GO',
          web_app: { url: API_URL }
        }
      });

      const startBot = async (retries = 5) => {
        try {
          await new Promise(resolve => setTimeout(resolve, 2000));
          await this.bot.launch({ dropPendingUpdates: true });
          this.logger.log('✅ Бот успешно запущен!');
        } catch (err: any) {
          if (err.response?.error_code === 409 && retries > 0) {
            this.logger.warn(`⚠️ Конфликт 409. Ждем 5 сек... (Осталось: ${retries})`);
            setTimeout(() => startBot(retries - 1), 5000);
          }
        }
      };

      startBot();

    } catch (error) {
      this.logger.error(`❌ Ошибка инициализации бота: ${(error as Error).message}`);
    }
  }

  // ==========================================
  // ПУБЛИЧНЫЙ МЕТОД ДЛЯ УВЕДОМЛЕНИЙ (Используется в Cron)
  // ==========================================
  public async sendNotification(telegramId: number | bigint | string, message: string) {
    try {
      const user = await this.prisma.user.findFirst({ where: { telegramId: BigInt(telegramId) } });
      if (user && user.notificationsEnabled === false) return; // Юзер выключил пуши в Mini App

      await this.bot.telegram.sendMessage(telegramId.toString(), message, { parse_mode: 'HTML' });
    } catch (error) {
      this.logger.error(`Ошибка отправки уведомления ${telegramId}: ${(error as Error).message}`);
    }
  }

  // ==========================================
  // ГЛАВНОЕ МЕНЮ (Теперь это просто Launcher)
  // ==========================================
  private async getMainMenu(telegramId: number) {
    const user = await this.prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
    });

    if (!user) return { text: '❌ Ошибка. Напиши /start', keyboard: null };

    // Красивое приветствие с акцентом на приложение
    const text = `🌟 <b>PRIME GO СЕРВИСЫ</b> 🌟\n\nПривет, <b>${user.firstName}</b>! 👋\n\nМы обновили наш сервис. Теперь управление VPN, балансом и поддержка находятся в нашем удобном приложении!\n\n👇 Нажми <b>Открыть PRIME GO</b>, чтобы начать.`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.webApp('🚀 ОТКРЫТЬ PRIME GO', API_URL)], // ОГРОМНАЯ КНОПКА
      [Markup.button.callback('🔐 Настроить пароль для входа', 'menu_password')],
      [Markup.button.callback('🆘 Поддержка', 'menu_support')]
    ]);

    return { text, keyboard };
  }

  private registerCommands() {
    this.bot.command('start', async (ctx) => {
      try {
        const telegramId = ctx.from.id;
        const { first_name: firstName = '', last_name: lastName = '', username = '' } = ctx.from;

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

    this.bot.command('menu', async (ctx) => {
      const menu = await this.getMainMenu(ctx.from.id);
      if (menu.keyboard) await ctx.reply(menu.text, { ...menu.keyboard, parse_mode: 'HTML' });
    });

    // Установка пароля
    this.bot.on('text', async (ctx) => {
      const telegramId = ctx.from.id;
      if (!this.waitingForPassword.has(telegramId)) return;

      const action = this.waitingForPassword.get(telegramId);
      
      try {
        const hashedPassword = await bcrypt.hash(ctx.message.text, 10);
        await this.prisma.user.update({
          where: { telegramId: BigInt(telegramId) },
          data: { password: hashedPassword },
        });

        try { await ctx.deleteMessage(); } catch (e) {} // Удаляем пароль из чата

        const msg = action === 'set' ? '✅ Пароль успешно установлен!' : '✅ Пароль успешно изменён!';
        const menu = await this.getMainMenu(telegramId);
        await ctx.reply(`${msg}\n\nТеперь ты можешь войти в приложение!`, { ...menu.keyboard, parse_mode: 'HTML' });

        this.waitingForPassword.delete(telegramId);
      } catch (error) {
        await ctx.reply('⚠️ Ошибка. Попробуй позже.');
        this.waitingForPassword.delete(telegramId);
      }
    });
  }

  private registerActions() {
    this.bot.action('menu_password', async (ctx) => {
      const telegramId = ctx.from.id;
      const user = await this.prisma.user.findUnique({ where: { telegramId: BigInt(telegramId) } });

      this.waitingForPassword.set(telegramId, user?.password ? 'reset' : 'set');
      
      await ctx.editMessageText(
        '🔐 <b>Установка пароля</b>\n\nОтправь мне пароль, который будешь использовать для входа в <b>Mini App</b>.\n<i>(Он будет зашифрован и сразу удален из чата)</i>',
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'menu_main')]])
        }
      );
      await ctx.answerCbQuery();
    });

    this.bot.action('menu_support', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.editMessageText(
        '🆘 <b>Служба поддержки</b>\n\nЕсли приложение не открывается или есть другие вопросы, напиши админу:',
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [Markup.button.url('✉️ Написать', 'https://t.me/HazDeen')],
            [Markup.button.callback('🔙 Назад', 'menu_main')]
          ])
        }
      );
    });

    this.bot.action('menu_main', async (ctx) => {
      const menu = await this.getMainMenu(ctx.from.id);
      if (menu.keyboard) {
        await ctx.editMessageText(menu.text, { ...menu.keyboard, parse_mode: 'HTML' });
      }
      this.waitingForPassword.delete(ctx.from.id);
      await ctx.answerCbQuery();
    });
  }
}