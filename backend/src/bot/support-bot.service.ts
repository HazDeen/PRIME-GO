import { Injectable, OnModuleInit, BeforeApplicationShutdown, Logger } from '@nestjs/common';
import { Telegraf } from 'telegraf';

@Injectable()
export class SupportBotService implements OnModuleInit, BeforeApplicationShutdown {
  private bot: Telegraf;
  private readonly logger = new Logger(SupportBotService.name);
  private readonly adminId = process.env.SUPPORT_ADMIN_ID;

  // База знаний для автоответчика
  private readonly knowledgeBase = [
    {
      keywords: ['как', 'подключить', 'настроить', 'ios', 'android', 'iphone', 'айфон', 'андроид'],
      answer: `🤖 <b>Автоответ:</b>\n\nДля подключения VPN:\n1. Скачайте приложение v2RayTun (для iOS) или v2rayNG (для Android).\n2. Зайдите в наше Mini App и нажмите "Скопировать ссылку" на карточке устройства.\n3. Откройте скачанное приложение и вставьте ссылку.`
    },
    {
      keywords: ['оплат', 'пополн', 'деньг', 'баланс', 'счет', 'рубл'],
      answer: `🤖 <b>Автоответ:</b>\n\nВ данный момент мы обновляем платежный шлюз.\nДля пополнения баланса переведите нужную сумму по реквизитам:\n💳 <code>4377 7237 8841 3734</code>\n\nПосле оплаты просто скиньте скриншот чека сюда в чат, и админ зачислит деньги вручную!`
    },
    {
      keywords: ['не работает', 'сломался', 'ошибка', 'интернет', 'пропал'],
      answer: `🤖 <b>Автоответ:</b>\n\nЕсли интернет перестал работать, попробуйте:\n1. Зайти в Mini App и проверить, не закончилась ли подписка.\n2. Нажать кнопку 🔄 (Обновить) рядом со ссылкой конфигурации и вставить её в приложение заново.\n\nЕсли это не помогло — ожидайте, я позову оператора.`
    }
  ];

  constructor() {
    const token = process.env.SUPPORT_BOT_TOKEN;
    if (!token) {
      this.logger.warn('⚠️ SUPPORT_BOT_TOKEN не найден. Отдельный бот поддержки выключен.');
      return;
    }
    // Инициализируем ВТОРОГО бота
    this.bot = new Telegraf(token);
  }

  async onModuleInit() {
    if (!this.bot) return;

    // Приветствие нового пользователя
    this.bot.start((ctx) => {
      ctx.reply('👋 Привет! Это служба поддержки PRIME GO.\n\nЗадайте ваш вопрос. Если я не смогу помочь сам, я мгновенно передам его живому оператору.');
    });

    // Главный обработчик всех текстовых сообщений
    this.bot.on('text', async (ctx) => {
      const text = ctx.message.text;
      const userId = ctx.from.id.toString();

      // ==========================================
      // 1. ПРОВЕРКА: ПИШЕТ АДМИН (Ответ на тикет)
      // ==========================================
      // Если это пишет админ, и он делает Reply (Ответить) на сообщение от бота
      if (userId === this.adminId && ctx.message.reply_to_message) {
        const repliedText = (ctx.message.reply_to_message as any).text || '';
        
        // Вытаскиваем ID пользователя из текста пересланного сообщения
        const match = repliedText.match(/ID:\s*(\d+)/);
        
        if (match) {
          const targetUserId = match[1];
          try {
            // Отправляем ответ админа юзеру
            await this.bot.telegram.sendMessage(
              targetUserId, 
              `👨‍💻 <b>Ответ оператора:</b>\n\n${text}`, 
              { parse_mode: 'HTML' }
            );
            await ctx.reply('✅ Ответ успешно доставлен клиенту.');
          } catch (e) {
            await ctx.reply('❌ Ошибка отправки. Возможно, клиент заблокировал бота поддержки.');
          }
          return; // Завершаем выполнение, чтобы ответ админа не попал в базу знаний
        }
      }

      // ==========================================
      // 2. ПРОВЕРКА: ПИШЕТ КЛИЕНТ (Автоответчик)
      // ==========================================
      const lowerText = text.toLowerCase();
      
      // Если юзер прямо не просит позвать человека, ищем ответ в базе
      if (!lowerText.includes('человек') && !lowerText.includes('оператор') && !lowerText.includes('админ')) {
        for (const rule of this.knowledgeBase) {
          // Если нашли совпадение по ключевому слову
          if (rule.keywords.some(kw => lowerText.includes(kw))) {
            await ctx.replyWithHTML(rule.answer);
            return;
          }
        }
      }

      // ==========================================
      // 3. СОЗДАНИЕ ТИКЕТА (Пересылка Админу)
      // ==========================================
      if (!this.adminId) {
        await ctx.reply('К сожалению, операторы сейчас недоступны.');
        return;
      }

      const username = ctx.from.username ? `@${ctx.from.username}` : 'Без юзернейма';
      
      try {
        // Формируем красивый тикет и отправляем тебе (админу) в личку
        await this.bot.telegram.sendMessage(
          this.adminId,
          `📨 <b>Новое обращение (Тикет)</b>\nОт: ${username}\nID: <code>${userId}</code>\n\n<b>Текст:</b>\n${text}`,
          { parse_mode: 'HTML' }
        );
        // Сообщаем юзеру, что вопрос ушел админу
        await ctx.reply('⏳ Ваш вопрос передан специалисту. Пожалуйста, ожидайте ответа.');
      } catch (e) {
        this.logger.error('Не удалось отправить тикет админу. Проверьте SUPPORT_ADMIN_ID.', e);
      }
    });

    // Обработка фотографий (например, чеков об оплате)
    this.bot.on('photo', async (ctx) => {
      const userId = ctx.from.id.toString();
      const username = ctx.from.username ? `@${ctx.from.username}` : 'Без юзернейма';
      
      if (userId === this.adminId) return; // Админские фотки игнорим

      if (this.adminId) {
        await this.bot.telegram.sendPhoto(
          this.adminId,
          ctx.message.photo[ctx.message.photo.length - 1].file_id,
          { 
            caption: `📸 <b>Фото от клиента</b>\nОт: ${username}\nID: <code>${userId}</code>\n\n${ctx.message.caption || ''}`,
            parse_mode: 'HTML'
          }
        );
        await ctx.reply('📸 Фото получено и передано специалисту!');
      }
    });

    // Запуск второго бота
    this.bot.launch().then(() => this.logger.log('✅ Отдельный Support Бот успешно запущен!'));
  }

  async beforeApplicationShutdown(signal?: string) {
    if (this.bot) {
      this.bot.stop(signal);
    }
  }
}