import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LoggerService implements NestLoggerService {
  private context: string;
  private readonly logsDir = path.join(process.cwd(), 'logs');
  private readonly consoleLogFile = path.join(this.logsDir, 'console.log');
  private readonly errorLogFile = path.join(this.logsDir, 'error.log');

  // ✅ УБИРАЕМ ПАРАМЕТРЫ ИЗ КОНСТРУКТОРА!
  constructor() {
    this.context = 'APP';
    this.ensureLogsDirectory();
  }

  // ✅ МЕТОД ДЛЯ УСТАНОВКИ КОНТЕКСТА
  setContext(context: string) {
    this.context = context;
    return this;
  }

  private ensureLogsDirectory() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  private formatMessage(message: any, level: string): string {
    const timestamp = new Date().toISOString();
    const contextStr = this.context ? `[${this.context}]` : '';
    return `${timestamp} ${level} ${contextStr} ${message}`;
  }

  private writeToFile(filePath: string, message: string) {
    try {
      fs.appendFileSync(filePath, message + '\n');
    } catch (error) {
      console.error('Failed to write log to file:', error);
    }
  }

  log(message: any, ...optionalParams: any[]) {
    const formatted = this.formatMessage(message, '📘 LOG');
    console.log(formatted, ...optionalParams);
    this.writeToFile(this.consoleLogFile, formatted);
  }

  error(message: any, ...optionalParams: any[]) {
    const formatted = this.formatMessage(message, '❌ ERROR');
    console.error(formatted, ...optionalParams);
    this.writeToFile(this.errorLogFile, formatted);
    this.writeToFile(this.consoleLogFile, formatted);
  }

  warn(message: any, ...optionalParams: any[]) {
    const formatted = this.formatMessage(message, '⚠️ WARN');
    console.warn(formatted, ...optionalParams);
    this.writeToFile(this.consoleLogFile, formatted);
  }

  debug(message: any, ...optionalParams: any[]) {
    const formatted = this.formatMessage(message, '🐛 DEBUG');
    console.debug(formatted, ...optionalParams);
    this.writeToFile(this.consoleLogFile, formatted);
  }

  verbose(message: any, ...optionalParams: any[]) {
    const formatted = this.formatMessage(message, '📋 VERBOSE');
    console.log(formatted, ...optionalParams);
    this.writeToFile(this.consoleLogFile, formatted);
  }

  // 📢 ОТПРАВКА ВАЖНЫХ ЛОГОВ В TELEGRAM АДМИНУ
  async notifyAdmin(bot: any, adminId: number, message: string, data?: any) {
    try {
      const text = data 
        ? `🔔 **${message}**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``
        : `🔔 **${message}**`;
      
      await bot.telegram.sendMessage(adminId, text, { parse_mode: 'Markdown' });
      this.log(`📨 Admin notified: ${message}`);
    } catch (error) {
      this.error(`Failed to notify admin: ${error.message}`);
    }
  }
}

// ✅ Фабрика для создания логгера с контекстом
export function createLogger(context: string) {
  const logger = new LoggerService();
  logger.setContext(context);
  return logger;
}