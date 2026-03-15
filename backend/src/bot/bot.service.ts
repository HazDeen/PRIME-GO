import { Injectable, OnModuleInit, BeforeApplicationShutdown, Logger } from '@nestjs/common';
import { Telegraf, Markup } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

const API_URL = 'https://hazdeen.github.io/PRIME-GO/';

@Injectable()
export class BotService implements OnModuleInit, BeforeApplicationShutdown {
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

  async beforeApplicationShutdown(signal?: string) {
    this.logger.warn(`🛑 Получен сигнал ${signal}. Экстренно отключаем бота от Telegram...`);
    try {
      this.bot.stop(signal);
      this.logger.log('✅ Бот успешно отключен от серверов Telegram.');
    } catch (e) {
      this.logger.error('Ошибка при остановке бота', e);
    }
  }

  async onModuleInit() {
    try {
      this.logger.log('🚀 Бот запускается...');

      // 1. Очищаем вебхуки на всякий случай
      await this.bot.telegram.deleteWebhook({ drop_pending_updates: true });
      this.logger.log('🧹 Старые сессии и вебхуки очищены');

      const botInfo = await this.bot.telegram.getMe();
      this.logger.log(`✅ Бот авторизован: @${botInfo.username}`);
      
      this.registerCommands();
      this.registerActions();

      // 2. Умный запуск с повторными попытками (Retry Logic)
      const startBot = async (retries = 5) => {
        try {
          // Ждем 2 секунды перед первым запуском, чтобы дать старому контейнеру время умереть
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          await this.bot.launch({ 
            dropPendingUpdates: true,
            allowedUpdates: ['message', 'callback_query'] 
          });
          this.logger.log('✅ Бот успешно запущен и слушает обновления!');
        } catch (err: any) {
          if (err.response?.error_code === 409 && retries > 0) {
            this.logger.warn(`⚠️ Конфликт 409. Старый контейнер еще жив. Ждем 5 сек... (Осталось попыток: ${retries})`);
            setTimeout(() => startBot(retries - 1), 5000); // Пробуем снова через 5 секунд
          } else {
            this.logger.error(`❌ Критическая ошибка запуска бота: ${err.message}`);
          }
        }
      };

      // Запускаем процесс
      startBot();

      // 3. Учим бота КОРРЕКТНО отключаться, когда Railway присылает команду на остановку старого контейнера
      process.once('SIGINT', () => {
        this.logger.log('🛑 Получен сигнал SIGINT (Остановка)');
        this.bot.stop('SIGINT');
      });
      process.once('SIGTERM', () => {
        this.logger.log('🛑 Получен сигнал SIGTERM (Railway убивает контейнер)');
        this.bot.stop('SIGTERM');
      });

    } catch (error) {
      this.logger.error(`❌ Ошибка инициализации бота: ${(error as Error).message}`);
    }
  }

  // ==========================================
  // ПУБЛИЧНЫЙ МЕТОД ДЛЯ ОТПРАВКИ УВЕДОМЛЕНИЙ
  // ==========================================
  // ==========================================
  // ПУБЛИЧНЫЙ МЕТОД ДЛЯ ОТПРАВКИ УВЕДОМЛЕНИЙ
  // ==========================================
  public async sendNotification(telegramId: number | bigint | string, message: string) {
    try {
      // 1. Ищем пользователя в базе по его telegramId
      // (Оборачиваем в BigInt, так как судя по прошлым файлам, ID хранится в BigInt)
      const user = await this.prisma.user.findFirst({
        where: { telegramId: BigInt(telegramId) } 
      });

      // 2. ПРОВЕРКА: Если юзер не найден ИЛИ у него выключены уведомления — прерываем функцию
      if (user && user.notificationsEnabled === false) {
        this.logger.log(`Отправка пропущена: пользователь ${telegramId} отключил уведомления.`);
        return; // Выходим из функции, сообщение не отправляется
      }

      // 3. Если всё ок, отправляем сообщение
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
      [Markup.button.webApp('🚀 Открыть PRIME GO', `${API_URL}`)],
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

        // 🌟 1. Сначала проверяем, есть ли юзер в базе и есть ли у него уже аватарка
        const existingUser = await this.prisma.user.findUnique({
          where: { telegramId: BigInt(telegramId) }
        });

        let avatarBase64 = null;

        // 🌟 2. Если юзера нет ИЛИ у него нет аватарки — только тогда качаем из Telegram
        if (!existingUser || !existingUser.avatarUrl) {
          try {
            const profilePhotos = await ctx.telegram.getUserProfilePhotos(telegramId, 0, 1);
            
            if (profilePhotos.total_count > 0) {
              const fileId = profilePhotos.photos[0][0].file_id;
              const fileLink = await ctx.telegram.getFileLink(fileId);
              const response = await fetch(fileLink.href);
              const arrayBuffer = await response.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              avatarBase64 = `data:image/jpeg;base64,${buffer.toString('base64')}`;
            }
          } catch (avatarError) {
            this.logger.warn(`Не удалось получить аватарку для ${telegramId}: ${(avatarError as Error).message}`);
          }
        }

        // 🌟 3. Сохраняем в базу
        await this.prisma.user.upsert({
          where: { telegramId: BigInt(telegramId) },
          update: { 
            firstName, 
            lastName, 
            username,
            // Если бот скачал новую аватарку (т.к. старой не было), то записываем её
            ...(avatarBase64 && { avatarUrl: avatarBase64 }) 
          },
          create: {
            telegramId: BigInt(telegramId),
            firstName, 
            lastName, 
            username,
            balance: 0, 
            isAdmin: false,
            avatarUrl: avatarBase64, // Записываем при первой регистрации
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

    // ==========================================
    // СПИСОК УСТРОЙСТВ ПОЛЬЗОВАТЕЛЯ
    // ==========================================
    this.bot.action('menu_devices', async (ctx) => {
      const telegramId = ctx.from.id;
      
      const user = await this.prisma.user.findUnique({
        where: { telegramId: BigInt(telegramId) },
        include: { devices: true }, // Подтягиваем все устройства юзера
      });

      // Если устройств нет
      if (!user || user.devices.length === 0) {
        await ctx.editMessageText(
          '📭 <b>У тебя пока нет устройств</b>\n\nТы можешь создать новый VPN в нашем приложении!',
          {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
              [Markup.button.webApp('🚀 Открыть приложение', `${API_URL}`)],
              [Markup.button.callback('🔙 Назад', 'menu_main')]
            ])
          }
        );
        return;
      }

      // Генерация кнопок для каждого устройства
      const deviceButtons = user.devices.map(device => [
        Markup.button.callback(
          `${device.isActive ? '🟢' : '🔴'} ${device.name}`, 
          `device_${device.id}` // Передаем ID устройства в callback_data
        )
      ]);

      // Добавляем кнопку "Назад" в самый низ
      deviceButtons.push([Markup.button.callback('🔙 Назад', 'menu_main')]);

      await ctx.editMessageText(
        '📱 <b>Мои устройства</b>\n\nВыбери устройство из списка ниже, чтобы получить ссылку для подключения:',
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard(deviceButtons)
        }
      );
    });

    // ==========================================
    // ДЕТАЛИ КОНКРЕТНОГО УСТРОЙСТВА И КОНФИГ
    // ==========================================
    // Используем регулярное выражение, чтобы ловить клики по device_1, device_2 и т.д.
    this.bot.action(/^device_(\d+)$/, async (ctx) => {
      const deviceId = parseInt(ctx.match[1], 10);
      const telegramId = ctx.from.id;

      const device = await this.prisma.device.findUnique({
        where: { id: deviceId },
        include: { user: true }
      });

      // Проверка безопасности: существует ли устройство и принадлежит ли оно этому юзеру
      if (!device || device.user.telegramId !== BigInt(telegramId)) {
        await ctx.answerCbQuery('Устройство не найдено!', { show_alert: true });
        return;
      }

      const status = device.isActive ? '🟢 Активно' : '🔴 Неактивно (пополните баланс)';
      
      // Делаем ссылку моноширинной (в теге <code>), чтобы в Telegram она копировалась по 1 клику
      const configLink = device.configLink 
        ? `<code>${device.configLink}</code>` 
        : '<i>Ссылка недоступна или генерируется...</i>';

      const text = `📱 <b>Устройство:</b> ${device.name}\n` +
                   `📊 <b>Статус:</b> ${status}\n\n` +
                   `🔗 <b>Твоя ссылка для подключения (VLESS):</b>\n${configLink}\n\n` +
                   `<i>👆 Нажми на ссылку, чтобы скопировать её, и вставь в приложение v2rayNG (Android) или Vibe/Foxray (iOS).</i>`;

      await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔙 К списку устройств', 'menu_devices')],
          [Markup.button.callback('🏠 В главное меню', 'menu_main')]
        ])
      });
    });

    this.bot.action('menu_topup', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.editMessageText(
        '💳 <b>Пополнение баланса</b>\n\nПополнить счет можно внутри нашего Mini App!',
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [Markup.button.webApp('🚀 Открыть приложение', `${API_URL}`)],
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
            [Markup.button.url('✉️ Написать админу', 'https://t.me/Prime_Go_ADMIN')], // Замени на свой тег
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
            [Markup.button.url('Отрыть панель (Web)', `${API_URL}#/admin`)],
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

}