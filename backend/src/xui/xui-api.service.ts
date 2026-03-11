import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as https from 'https';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class XuiApiService {
  private readonly logger = new Logger(XuiApiService.name);
  
  // Храним подключения к разным панелям (ключ - локация: 'ch' или 'at')
  private apis: Record<string, { instance: AxiosInstance; isLoggedIn: boolean }> = {};

  constructor(private readonly configService: ConfigService) {}

  // Получаем настройки для конкретной локации
  private getServerConfig(location: string) {
    const prefix = location.toUpperCase(); // 'CH' или 'AT'
    return {
      url: process.env[`XUI_${prefix}_PANEL_URL`],
      username: process.env[`XUI_${prefix}_USERNAME`],
      password: process.env[`XUI_${prefix}_PASSWORD`],
      host: process.env[`VLESS_${prefix}_HOST`],
      inboundId: Number(process.env[`XUI_${prefix}_INBOUND_ID`]) || 1
    };
  }

  // Ленивая авторизация (подключаемся только при запросе)
  private async ensureLogin(location: string) {
    if (this.apis[location]?.isLoggedIn) return;

    const config = this.getServerConfig(location);
    if (!config.url) throw new Error(`Не настроены доступы для сервера ${location}`);

    try {
      this.logger.log(`🔐 Логинимся в панель [${location.toUpperCase()}]: ${config.url}`);
      
      const apiInstance = axios.create({
        baseURL: config.url,
        withCredentials: true,
        httpsAgent: new https.Agent({ rejectUnauthorized: false })
      });

      const response = await apiInstance.post('/login', {
        username: config.username,
        password: config.password
      });

      const cookies = response.headers['set-cookie'];
      if (cookies) {
        apiInstance.defaults.headers.common['Cookie'] = cookies.join('; ');
        this.apis[location] = { instance: apiInstance, isLoggedIn: true };
        this.logger.log(`✅ Вход выполнен [${location.toUpperCase()}]`);
      } else {
        throw new Error('Куки не получены');
      }
    } catch (error: any) {
      this.logger.error(`❌ Ошибка входа [${location.toUpperCase()}]:`, error.message);
      throw error;
    }
  }

  // Создание клиента на НУЖНОМ сервере
  async addClient(location: string, clientData: any) {
    await this.ensureLogin(location);
    const api = this.apis[location].instance;
    const config = this.getServerConfig(location);

    const inboundConfig = await this.getInboundConfig(location, config.inboundId);
    if (!inboundConfig) return { success: false, msg: 'Ошибка получения настроек из панели' };

    const clientUuid = clientData.uuid;
    const clientEmail = `${Math.random().toString(36).substring(7)}`;
    const client = {
      id: clientUuid,
      email: clientEmail,
      flow: 'xtls-rprx-vision',
      limitIp: 2,
      totalGB: clientData.totalGb || 0,
      expiryTime: clientData.expiryTime || 0,
      enable: true,
      tgId: clientData.tgUid || "",
      subId: Math.random().toString(36).substring(2, 12),
    };

    const payload = new URLSearchParams({
      id: config.inboundId.toString(),
      settings: JSON.stringify({ clients: [client] }),
    });

    try {
      const response = await api.post('/panel/inbound/addClient', payload.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }
      });

      if (response.data?.success) {
        const vlessLink = `vless://${clientUuid}@${inboundConfig.host}:${inboundConfig.port}?security=reality&pbk=${inboundConfig.pbk}&fp=chrome&sni=${inboundConfig.sni}&sid=${inboundConfig.sid}&flow=xtls-rprx-vision&type=tcp#PRIME-${location.toUpperCase()}-${clientEmail}`;

        return { success: true, configLink: vlessLink, email: clientEmail, uuid: clientUuid };
      }
      return { success: false, msg: response.data?.msg };
    } catch (error: any) {
      return { success: false, msg: error.message };
    }
  }

  // Удаление клиента с НУЖНОГО сервера
  async deleteClient(location: string, uuid: string) {
    await this.ensureLogin(location);
    const api = this.apis[location].instance;
    const config = this.getServerConfig(location);

    try {
      const response = await api.post(`/panel/inbound/${config.inboundId}/delClient/${uuid}`);
      return response.data;
    } catch (error: any) {
      return { success: false, msg: error.message };
    }
  }

  // Получение настроек с НУЖНОГО сервера
  async getInboundConfig(location: string, inboundId: number) {
    await this.ensureLogin(location);
    const api = this.apis[location].instance;
    const host = this.getServerConfig(location).host;
    
    try {
      const response = await api.post('/panel/inbound/list');
      if (response.data?.success && Array.isArray(response.data.obj)) {
        const inbound = response.data.obj.find((i: any) => i.id == inboundId);
        if (!inbound) return null;

        const streamSettings = JSON.parse(inbound.streamSettings);
        return {
          port: inbound.port,
          protocol: inbound.protocol,
          pbk: streamSettings.realitySettings.settings?.publicKey || streamSettings.realitySettings.publicKey,
          sid: streamSettings.realitySettings.shortIds[0],
          sni: streamSettings.realitySettings.serverNames[0],
          host: host
        };
      }
      return null;
    } catch (error: any) {
      return null;
    }
  }
}