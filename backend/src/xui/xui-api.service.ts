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

    // 1. Сначала берем актуальные настройки из панели
    const inboundConfig = await this.getInboundConfig(inboundId);
    if (!inboundConfig) {
      return { success: false, msg: 'Ошибка получения настроек из панели' };
    }

    const clientUuid = clientData.uuid;
    const clientEmail = `user-${clientData.userId}-${Math.random().toString(36).substring(7)}`;
    const client = {
      id: clientUuid,
      email: clientEmail,
      flow: 'xtls-rprx-vision',
      limitIp: 2,
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
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }
      });

      if (response.data?.success) {
        // 2. СОБИРАЕМ ССЫЛКУ НА ОСНОВЕ ДАННЫХ ИЗ ПАНЕЛИ
        const remark = encodeURIComponent(clientData.name || 'VPN');
        const vlessLink = `vless://${clientUuid}@${inboundConfig.host}:${inboundConfig.port}?security=reality&sni=${inboundConfig.sni}&fp=chrome&pbk=${inboundConfig.pbk}&sid=${inboundConfig.sid}&flow=xtls-rprx-vision&type=tcp#${clientEmail}`;

        return { 
          success: true, 
          configLink: vlessLink,
          email: clientEmail,
          uuid: clientUuid 
        };
      }
      return { success: false, msg: response.data?.msg };
    } catch (error: any) {
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

  async getInboundConfig(inboundId: number) {
    await this.ensureLogin();
    
    try {
      // Используем /list вместо /get — это работает стабильнее
      const response = await this.api.get('/panel/inbound/list');
      
      if (response.data?.success && Array.isArray(response.data.obj)) {
        const inbounds = response.data.obj;
        
        // Ищем нужный инбаунд. Используем == для сравнения (число/строка)
        const inbound = inbounds.find((i: any) => i.id == inboundId);
        
        if (!inbound) {
          this.logger.error(`❌ Inbound с ID ${inboundId} не найден в панели. Доступные ID: ${inbounds.map(i => i.id).join(', ')}`);
          return null;
        }

        const streamSettings = JSON.parse(inbound.streamSettings);
        
        // Извлекаем параметры для VLESS + Reality + TCP
        return {
          port: inbound.port,
          protocol: inbound.protocol,
          pbk: streamSettings.realitySettings.publicKey,
          sid: streamSettings.realitySettings.shortIds[0],
          sni: streamSettings.realitySettings.serverNames[0],
          host: this.configService.get('VLESS_HOST')
        };
      }
      
      this.logger.error(`❌ Панель вернула ошибку при запросе списка: ${JSON.stringify(response.data)}`);
      return null;
    } catch (error: any) {
      this.logger.error(`❌ Критическая ошибка XUI API: ${error.message}`);
      return null;
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