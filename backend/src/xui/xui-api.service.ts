import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios'; // Добавили импорт axios
import * as https from 'https'; // Добавили импорт https

@Injectable()
export class XuiApiService implements OnModuleInit {
  private readonly logger = new Logger(XuiApiService.name);
  private api: AxiosInstance; // Будем использовать только это имя
  private isLoggedIn = false;
  
  private readonly panelUrl = process.env.XUI_PANEL_URL;
  private readonly username = process.env.XUI_USERNAME;
  private readonly password = process.env.XUI_PASSWORD;

  async onModuleInit() {
    await this.login();
  }

  private async login() {
    try {
      this.logger.log(`🔐 Логинимся в панель 3x-ui: ${this.panelUrl}`);

      // Инициализируем экземпляр при логине
      this.api = axios.create({
        baseURL: this.panelUrl,
        withCredentials: true,
        httpsAgent: new https.Agent({  
          rejectUnauthorized: false // Чтобы не ругался на самоподписанные SSL
        })
      });

      const response = await this.api.post('/login', {
        username: this.username,
        password: this.password
      });

      const cookies = response.headers['set-cookie'];
      if (cookies) {
        // Устанавливаем куки во все последующие запросы этого экземпляра
        this.api.defaults.headers.common['Cookie'] = cookies.join('; ');
        this.isLoggedIn = true;
        this.logger.log('✅ Успешный вход в 3x-ui панель');
      } else {
        throw new Error('Не удалось получить куки авторизации');
      }
    } catch (error: any) {
      this.logger.error('❌ Ошибка входа в 3x-ui:', error.message);
      throw error;
    }
  }

  // Вспомогательный метод для проверки авторизации перед каждым запросом
  private async ensureLogin() {
    if (!this.isLoggedIn || !this.api) {
      await this.login();
    }
  }

  // --- ГЛАВНЫЕ МЕТОДЫ ДЛЯ ВАШЕГО DEVICE SERVICE ---

  async addClient(inboundId: number, clientData: any) {
    await this.ensureLogin();

    const client = {
      id: clientData.uuid,
      email: clientData.email,
      flow: clientData.flow || 'xtls-rprx-vision',
      limitIp: 2,
      totalGB: clientData.totalGb || 0, // уже должно быть в байтах из сервиса
      expiryTime: clientData.expiryTime || 0,
      enable: true,
      tgId: clientData.tgUid || "",
      subId: this.generateSubId(), // Генерируем случайный subId для ссылки
    };

    const payload = new URLSearchParams({
      id: inboundId.toString(),
      settings: JSON.stringify({ clients: [client] }),
    });

    try {
      const response = await this.api.post('/panel/inbound/addClient', payload.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        }
      });

      if (response.data?.success) {
        // Формируем ссылку на подписку
        const subscriptionUrl = this.formatSubUrl(client.subId);
        return { 
          success: true, 
          subscriptionUrl,
          uuid: client.id 
        };
      }
      return { success: false, msg: response.data?.msg };
    } catch (error: any) {
      this.logger.error('Ошибка addClient:', error.message);
      return { success: false, msg: error.message };
    }
  }

  async deleteClient(inboundId: number, uuid: string) {
    await this.ensureLogin();

    try {
      // В 3x-ui обычно такой путь для удаления клиента из инбаунда
      const response = await this.api.post(`/panel/inbound/${inboundId}/delClient/${uuid}`);
      return response.data;
    } catch (error: any) {
      this.logger.error('Ошибка deleteClient:', error.message);
      return { success: false, msg: error.message };
    }
  }

  // --- ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ---

  private generateSubId(): string {
    return Math.random().toString(36).substring(2, 12);
  }

  private formatSubUrl(subId: string): string {
    const subPort = process.env.SUB_PORT || 443;
    const subPath = process.env.SUB_PATH || '/sub/';
    // Очищаем URL от порта для формирования ссылки
    const base = this.panelUrl?.replace(/:\d+$/, '');
    return `${base}:${subPort}${subPath}${subId}`;
  }
}