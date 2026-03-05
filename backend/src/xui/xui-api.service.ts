import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios'; // Добавили импорт axios
import * as https from 'https'; // Добавили импорт https
import { ConfigService } from '@nestjs/config';

@Injectable()
export class XuiApiService implements OnModuleInit {
  private readonly logger = new Logger(XuiApiService.name);
  private api: AxiosInstance; // Будем использовать только это имя
  private isLoggedIn = false;
  
  constructor(
      private readonly configService: ConfigService, // 2. Внедряем его здесь
      // ... если здесь были другие сервисы (например HttpService), оставь их
    ) {}

  private readonly panelUrl = process.env.XUI_PANEL_URL;
  private readonly username = process.env.XUI_USERNAME;
  private readonly password = process.env.XUI_PASSWORD;

  private generateVlessLink(uuid: string, name: string): string {
    const host = this.configService.get('VLESS_HOST');
    const port = this.configService.get('VLESS_PORT');
    const pbk = this.configService.get('VLESS_PUBLIC_KEY');
    const sni = this.configService.get('VLESS_SNI');
    const sid = this.configService.get('VLESS_SID');
    const flow = 'xtls-rprx-vision'; 
    
    const remark = encodeURIComponent(name);
    // Формат ссылки для TCP + Reality + Vision
    return `vless://${uuid}@${host}:${port}?security=reality&sni=${sni}&fp=chrome&pbk=${pbk}&sid=${sid}&flow=${flow}&type=tcp#${remark}`;
  }

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
      flow: 'xtls-rprx-vision', // Для TCP Reality это поле обязательно
      limitIp: 5,
      totalGB: clientData.totalGb || 0,
      expiryTime: clientData.expiryTime || 0,
      enable: true,
      tgId: clientData.tgUid || "",
      subId: this.generateSubId(),
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
        // Генерируем прямую VLESS ссылку
        const vlessLink = this.generateVlessLink(client.id, clientData.name || 'VPN');
        
        return { 
          success: true, 
          configLink: vlessLink, // <--- Это пойдет в БД
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