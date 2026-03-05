// backend/src/xui/xui-api.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as https from 'https';

export interface CreateClientDto {
  inboundId?: number;
  tgUid: string | number;
  email: string;
  flow?: string;
  totalGb?: number;
  expiryTime?: number | Date | string;
  comment?: string;
}

@Injectable()
export class XuiApiService implements OnModuleInit {
  private readonly logger = new Logger(XuiApiService.name);
  private api: AxiosInstance;
  private isLoggedIn = false;
  private axiosInstance: AxiosInstance;
  private cookie: string = '';
  
  private readonly panelUrl = process.env.XUI_PANEL_URL;
  private readonly username = process.env.XUI_USERNAME;
  private readonly password = process.env.XUI_PASSWORD;

  async onModuleInit() {
    await this.login();
  }

  private async login() {
    try {
      this.logger.log(`🔐 Логинимся в панель 3x-ui: ${this.panelUrl}`);

      this.api = axios.create({
        baseURL: this.panelUrl,
        withCredentials: true,
        httpsAgent: new https.Agent({  
          rejectUnauthorized: false
        })
      });

      const response = await this.api.post('/login', {
        username: this.username,
        password: this.password
      });

      const cookies = response.headers['set-cookie'];
      if (cookies) {
        this.api.defaults.headers.Cookie = cookies.join('; ');
        this.isLoggedIn = true;
        this.logger.log('✅ Успешный вход в 3x-ui панель');
      } else {
        throw new Error('Не удалось получить куки авторизации');
      }
    } catch (error) {
      this.logger.error('❌ Ошибка входа в 3x-ui:', error.message);
      throw error;
    }
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private generateSubId(length: number = 16): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private parseExpiryTime(expiryTime: number | Date | string): number {
    if (!expiryTime) return 0;
    if (typeof expiryTime === 'number') return expiryTime;
    if (expiryTime instanceof Date) return expiryTime.getTime();
    return new Date(expiryTime).getTime();
  }

  async createClient(createClientDto: CreateClientDto) {
    try {
      if (!this.isLoggedIn) {
        await this.login();
      }

      const { 
        inboundId = 1, 
        tgUid,
        email,
        flow = 'xtls-rprx-vision',
        totalGb = 0,
        expiryTime,
        comment = ''
      } = createClientDto;

      const fullEmail = `${tgUid}-${email}`;
      const uuid = this.generateUUID();
      const subId = this.generateSubId();

      const clientObj = {
        id: uuid,
        flow: flow,
        email: fullEmail,
        limitIp: 0,
        totalGB: totalGb,
        expiryTime: expiryTime ? this.parseExpiryTime(expiryTime) : 0,
        enable: true,
        tgId: "",
        subId: subId,
        comment: comment,
        reset: 0
      };

      const settingsObj = {
        clients: [clientObj]
      };

      const settingsJson = JSON.stringify(settingsObj);
      
      const formBody = new URLSearchParams({
        id: inboundId.toString(),
        settings: settingsJson
      }).toString();

      this.logger.log(`📝 Отправка в 3x-ui:`, formBody);

      const response = await this.api.post('/panel/inbound/addClient', 
        formBody,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
          }
        }
      );
      
      this.logger.log(`📥 Статус: ${response.status}`);
      this.logger.log(`📥 Ответ:`, response.data);

      if (response.status === 200) {
        this.logger.log(`✅ Клиент ${fullEmail} создан`);
        
        const subscriptionUrl = await this.getSubscriptionLink(fullEmail);
        
        return {
          success: true,
          email: fullEmail,
          uuid,
          flow,
          subscriptionUrl
        };
      } else {
        throw new Error('Ошибка создания клиента');
      }
    } catch (error) {
      this.logger.error(`❌ Ошибка:`, error.response?.data || error.message);
      throw error;
    }
  }

  async getSubscriptionLink(email: string): Promise<string> {
    try {
      if (!this.isLoggedIn) await this.login();

      const response = await this.api.post('/xui/API/inbounds/list');
      
      if (!response.data?.success) return '';

      for (const inbound of response.data.obj) {
        if (inbound.clientStats) {
          for (const client of inbound.clientStats) {
            if (client.email === email && client.subId) {
              const subPort = process.env.SUB_PORT || 443;
              const subPath = process.env.SUB_PATH || '/sub/';
              const baseUrl = this.panelUrl.replace(/:\d+$/, '');
              return `${baseUrl}:${subPort}${subPath}${client.subId}`;
            }
          }
        }
      }
      return '';
    } catch (error) {
      this.logger.error('❌ Ошибка получения ссылки:', error);
      return '';
    }
  }

  async getInbounds() {
    try {
      if (!this.isLoggedIn) await this.login();

      const response = await this.api.post('/xui/API/inbounds/list');
      
      if (response.data?.success) {
        return response.data.obj;
      }
      return [];
    } catch (error) {
      this.logger.error('❌ Ошибка получения inbound:', error);
      return [];
    }
  }

  async deleteClientByUuid(inboundId: number, clientUuid: string) {
    try {
      if (!this.isLoggedIn) {
        await this.login();
      }

      const url = `/panel/inbound/${inboundId}/delClient/${clientUuid}`;
      
      this.logger.log(`🗑️ Удаление клиента: ${url}`);

      const response = await this.api.post(url, null, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        }
      });

      this.logger.log(`📥 Статус удаления: ${response.status}`);
      this.logger.log(`📥 Ответ:`, response.data);

      if (response.status === 200) {
        this.logger.log(`✅ Клиент ${clientUuid} удалён`);
        return { success: true };
      } else {
        throw new Error('Ошибка удаления клиента');
      }
    } catch (error) {
      this.logger.error(`❌ Ошибка удаления:`, error.response?.data || error.message);
      throw error;
    }
  }

  async getUserDevices(tgUid: string) {
    try {
      if (!this.isLoggedIn) {
        await this.login();
      }

      const response = await this.api.post('/xui/API/inbounds/list');
      
      if (!response.data?.success) {
        return [];
      }

      const devices = [];
      
      for (const inbound of response.data.obj) {
        if (inbound.clientStats) {
          for (const client of inbound.clientStats) {
            // Проверяем, начинается ли email с tgUid
            if (client.email && client.email.startsWith(`${tgUid}-`)) {
              // Получаем полные настройки клиента из settings
              const settings = JSON.parse(inbound.settings || '{}');
              const clientSettings = settings.clients?.find(c => c.id === client.id) || {};
              
              devices.push({
                id: client.id,
                uuid: client.id,
                email: client.email,
                name: clientSettings.comment || client.email.split('-')[1] || 'Устройство',
                type: clientSettings.comment?.split(':')[0] || 'Other',
                model: clientSettings.comment?.split(':')[1]?.trim() || '',
                subscriptionUrl: await this.getSubscriptionLink(client.email),
                expiryTime: client.expiryTime,
                totalGB: client.totalGB,
                up: client.up,
                down: client.down,
                enable: client.enable,
                inboundId: inbound.id
              });
            }
          }
        }
      }
      
      return devices;
    } catch (error) {
      this.logger.error('❌ Ошибка получения устройств:', error);
      return [];
    }
  }

  async updateClientComment(inboundId: number, clientUuid: string, comment: string) {
    try {
      if (!this.isLoggedIn) {
        await this.login();
      }

      // Сначала получаем текущие настройки клиента
      const listResponse = await this.api.post('/xui/API/inbounds/list');
      const inbound = listResponse.data.obj.find((i: any) => i.id === inboundId);
      
      if (!inbound) {
        throw new Error('Inbound не найден');
      }

      const settings = JSON.parse(inbound.settings);
      const clientIndex = settings.clients.findIndex((c: any) => c.id === clientUuid);
      
      if (clientIndex === -1) {
        throw new Error('Клиент не найден');
      }

      // Обновляем комментарий
      settings.clients[clientIndex].comment = comment;

      // Отправляем обновление
      const formBody = new URLSearchParams({
        id: inboundId.toString(),
        settings: JSON.stringify(settings)
      }).toString();

      const response = await this.api.post('/panel/inbound/updateClient', formBody, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        }
      });

      return response.data;
    } catch (error) {
      this.logger.error('❌ Ошибка обновления комментария:', error);
      throw error;
    }
  }

  async replaceClientLink(inboundId: number, clientUuid: string) {
    try {
      if (!this.isLoggedIn) {
        await this.login();
      }

      // Получаем текущие настройки
      const listResponse = await this.api.post('/xui/API/inbounds/list');
      const inbound = listResponse.data.obj.find((i: any) => i.id === inboundId);
      
      if (!inbound) {
        throw new Error('Inbound не найден');
      }

      const settings = JSON.parse(inbound.settings);
      const clientIndex = settings.clients.findIndex((c: any) => c.id === clientUuid);
      
      if (clientIndex === -1) {
        throw new Error('Клиент не найден');
      }

      // Генерируем новый subId
      const newSubId = this.generateSubId();
      settings.clients[clientIndex].subId = newSubId;

      // Отправляем обновление
      const formBody = new URLSearchParams({
        id: inboundId.toString(),
        settings: JSON.stringify(settings)
      }).toString();

      const response = await this.api.post('/panel/inbound/updateClient', formBody, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        }
      });

      // Формируем новую ссылку
      const subPort = process.env.SUB_PORT || 443;
      const subPath = process.env.SUB_PATH || '/sub/';
      const baseUrl = this.panelUrl.replace(/:\d+$/, '');
      const newSubscriptionUrl = `${baseUrl}:${subPort}${subPath}${newSubId}`;

      return {
        newSubscriptionUrl,
        newSubId
      };
    } catch (error) {
      this.logger.error('❌ Ошибка замены ссылки:', error);
      throw error;
    }
  }

  // Создать клиента
async addClient(inboundId: number, clientData: any) {
  if (!this.cookie) await this.login();

  const client = {
    id: clientData.uuid,
    email: clientData.email,
    flow: clientData.flow || 'xtls-rprx-vision',
    limitIp: 2,
    totalGB: clientData.totalGb * 1024 * 1024 * 1024,
    expiryTime: clientData.expiryTime,
    enable: true,
    tgId: clientData.tgUid,
    subId: clientData.email,
  };

  const payload = {
    id: inboundId,
    settings: JSON.stringify({ clients: [client] }),
  };

  const response = await this.axiosInstance.post('/panel/api/inbounds/addClient', payload, {
    headers: { Cookie: this.cookie },
  });
  return response.data;
}

// Удалить клиента
async deleteClient(inboundId: number, uuid: string) {
  if (!this.cookie) await this.login();

  // Удаление по UUID
  const response = await this.axiosInstance.post(
    `/panel/api/inbounds/client/${uuid}`, 
    {}, 
    {
      headers: { Cookie: this.cookie },
      params: { id: inboundId }
    }
  );
  return response.data;
}
  
}