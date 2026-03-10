import { toast } from 'sonner';
import type { DeviceType } from '../types/device';
import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = 'https://h4zdeen.up.railway.app';

export class Client {
  public api: AxiosInstance;

  constructor(baseURL: string) {
    this.api = axios.create({
      baseURL,
      withCredentials: true,
    });
  }

  async getUsers() {
    return this.api.get('/users');
  }

  async createUser(data: { telegramId: string; balance: number }) {
    return this.api.post('/users', data);
  }

  async getAllDevices() {
    return this.api.get('/devices/admin/all');
  }

  async createDevice(data: { tgId: string; name: string; type: string }) {
    return this.api.post('/devices', data);
  }
}

// Универсальная функция для заголовков
const getHeaders = (includeJson = true) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  let username = '';

  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      username = user.username || user.login || '';
    } catch (e) {
      console.error('❌ Ошибка парсинга данных пользователя');
    }
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token || ''}`,
    'x-username': username, 
  };

  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
};

let isCreatingDevice = false;

// 👇 ТЕПЕРЬ ВСЁ НАХОДИТСЯ В ОДНОМ ОБЪЕКТЕ CLIENT 👇
export const client = {
  
  // --- СИСТЕМА (Тех. работы) ---
  system: {
    getStatus: async () => {
      const res = await fetch(`${API_BASE_URL}/admin/status`); 
      if (!res.ok) throw new Error('Ошибка получения статуса системы');
      return res.json(); 
    }
  },

  // --- АВТОРИЗАЦИЯ ---
  auth: {
    login: async (username: string, password: string) => {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      return response.json();
    },
    register: async (username: string, password: string, referralCode?: string) => {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, referralCode })
      });
      return response.json();
    },
    logout: async () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('devices');
    }
  },

  // --- ТРАНЗАКЦИИ ---
  transactions: {
    getAll: async () => {
      const response = await fetch(`${API_BASE_URL}/transactions`, {
        headers: getHeaders()
      });
      return response.json();
    },
    create: async (data: any) => {
      const response = await fetch(`${API_BASE_URL}/transactions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      return response.json();
    }
  },

  // --- БАЛАНС ---
  balance: {
    get: async () => {
      const response = await fetch(`${API_BASE_URL}/user/balance`, {
        headers: getHeaders()
      });
      return response.json();
    },
    topup: async (amount: number) => {
      const response = await fetch(`${API_BASE_URL}/user/topup`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ amount })
      });
      return response.json();
    }
  },

  // --- УСТРОЙСТВА ---
  devices: {
    getAll: async () => {
      try {
        const userStr = localStorage.getItem('user');
        if (!userStr) return [];
        const user = JSON.parse(userStr);
        const tgUserId = user.telegramId || user.tgId || '0';
        
        const response = await fetch(`${API_BASE_URL}/devices/user/${tgUserId}`, {
            headers: getHeaders()
        });
        const data = await response.json();
        
        if (data.success) {
          localStorage.setItem('devices', JSON.stringify(data.data));
          return data.data.map((device: any) => ({
            id: device.id || Date.now(),
            name: device.name || device.email?.split('-')[1] || 'Устройство',
            model: device.model || '',
            type: device.type || 'Other',
            date: device.expiryTime ? new Date(device.expiryTime).toLocaleDateString('ru-RU') : 'Безлимитно',
            isActive: device.enable !== false,
            daysLeft: device.expiryTime ? Math.ceil((device.expiryTime - Date.now()) / (24 * 60 * 60 * 1000)) : undefined,
            configLink: device.subscriptionUrl || '',
            uuid: device.uuid || '',
            inboundId: device.inboundId || 1,
            email: device.email || '',
          }));
        }
        return [];
      } catch (error) {
        console.error('❌ Ошибка загрузки устройств:', error);
        const cached = localStorage.getItem('devices');
        return cached ? JSON.parse(cached) : [];
      }
    },

    create: async (data: { name: string; model: string; type: DeviceType; tgUserId: string; }) => {
      if (isCreatingDevice) return;
      isCreatingDevice = true;
      try {
        const response = await fetch(`${API_BASE_URL}/xui/client`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            inboundId: 1,
            tgUid: data.tgUserId,
            email: Math.random().toString(36).substring(2, 10),
            flow: 'xtls-rprx-vision',
            totalGb: 1000,
            expiryTime: Date.now() + 30 * 24 * 60 * 60 * 1000,
            comment: `${data.type}: ${data.model}`
          })
        });

        const xuiResult = await response.json();
        if (!response.ok || !xuiResult.success) {
          throw new Error(xuiResult.message || 'Ошибка 3x-ui');
        }

        const dbRes = await fetch(`${API_BASE_URL}/devices`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            name: data.name,
            model: data.model,
            type: data.type,
            uuid: xuiResult.data.uuid,
            subscriptionUrl: xuiResult.data.subscriptionUrl,
            tgUserId: data.tgUserId
          })
        });
        
        const dbResult = await dbRes.json();
        // 🚨 Если бэкенд отбил запрос (например, сработала блокировка)
        if (!dbRes.ok) {
          throw new Error(dbResult.message || 'Ошибка сохранения устройства');
        }
        
        return xuiResult;
      } catch (error: any) {
        throw error;
      } finally {
        isCreatingDevice = false;
      }
    },

    delete: async (deviceId: number, inboundId: number, uuid: string) => {
      try {
        const response = await fetch(`${API_BASE_URL}/xui/client/delete`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ inboundId, uuid })
        });
        const xuiResult = await response.json();
        if (!xuiResult.success) throw new Error('Ошибка 3x-ui');

        await fetch(`${API_BASE_URL}/devices/${deviceId}`, {
          method: 'DELETE',
          headers: getHeaders()
        });
        toast.success('✅ Устройство удалено');
        return true;
      } catch (error) {
        toast.error('❌ Ошибка удаления');
        return false;
      }
    },

    updateName: async (deviceId: number, newName: string, inboundId: number, uuid: string) => {
      try {
        const response = await fetch(`${API_BASE_URL}/xui/client/update`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ inboundId, uuid, comment: newName })
        });
        const xuiResult = await response.json();
        if (!xuiResult.success) throw new Error('Ошибка 3x-ui');

        await fetch(`${API_BASE_URL}/devices/${deviceId}`, {
          method: 'PATCH',
          headers: getHeaders(),
          body: JSON.stringify({ name: newName })
        });
        return true;
      } catch (error) {
        console.error(error);
        return false;
      }
    },

    replace: async (deviceId: number, inboundId: number, uuid: string) => {
      try {
        const response = await fetch(`${API_BASE_URL}/xui/client/replace-link`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ inboundId, uuid })
        });
        const data = await response.json();
        if (!data.success) throw new Error('Ошибка 3x-ui');

        await fetch(`${API_BASE_URL}/devices/${deviceId}`, {
          method: 'PATCH',
          headers: getHeaders(),
          body: JSON.stringify({ subscriptionUrl: data.data.newSubscriptionUrl })
        });
        return data.data.newSubscriptionUrl;
      } catch (error) {
        console.error(error);
        return null;
      }
    }
  },

  // --- ПРОФИЛЬ ---
  users: {
    getProfile: async () => {
      const response = await fetch(`${API_BASE_URL}/user/profile`, {
        headers: getHeaders()
      });
      return response.json();
    },
    updateProfile: async (data: any) => {
      const response = await fetch(`${API_BASE_URL}/user/profile`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      return response.json();
    }
  },

  // --- АДМИН ПАНЕЛЬ ---
  admin: {
    getStats: async () => {
      const response = await fetch(`${API_BASE_URL}/admin/stats`, {
        headers: getHeaders()
      });
      return response.json();
    },
    getUsers: async () => {
      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        headers: getHeaders()
      });
      return response.json();
    },
    getAllDevices: async () => {
      const response = await fetch(`${API_BASE_URL}/devices/admin/all`, {
        headers: getHeaders()
      });
      return response.json();
    },
    getUserDevices: async (userId: number) => {
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/devices`, {
        headers: getHeaders()
      });
      return response.json();
    },
    updateUserBalance: async (userId: number, balance: number) => {
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/balance`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ balance })
      });
      return response.json();
    },
    setAdminStatus: async (userId: number, isAdmin: boolean) => {
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/admin`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ isAdmin })
      });
      return response.json();
    },
    createUser: async (data: { telegramId: string; balance: number }) => {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      return response.json();
    },
    createDevice: async (data: { tgId: string; name: string; type: string }) => {
      const response = await fetch(`${API_BASE_URL}/devices`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      const result = await response.json();
      
      // 🚨 Жестко выбрасываем ошибку, чтобы остановить зеленый тост
      if (!response.ok) throw new Error(result.message || 'Ошибка создания устройства');
      
      return result;
    },
    updateUsername: async (userId: number, newUsername: string) => {
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/username`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ newUsername })
      });
      return response.json();
    },
    regenerateLink: async (deviceId: number) => {
      const response = await fetch(`${API_BASE_URL}/admin/devices/${deviceId}/regenerate`, {
        method: 'POST',
        headers: getHeaders()
      });
      return response.json();
    },
    addDeviceForUser: async (userId: number, data: { name: string, type: string }) => {
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/devices`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      const result = await response.json();
      
      // 🚨 Аналогичная проверка для модалки админа
      if (!response.ok) throw new Error(result.message || 'Ошибка создания устройства');
      
      return result;
    },
    deleteDevice: async (deviceId: number) => {
      const response = await fetch(`${API_BASE_URL}/admin/devices/${deviceId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!response.ok) {
        throw new Error(`Ошибка удаления: ${response.status}`);
      }
      return response.json();
    },
    getSettings: async () => {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const adminUsername = user?.username || '';

      const res = await fetch(`${API_BASE_URL}/admin/settings`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'x-username': adminUsername 
        }
      });
      
      if (!res.ok) throw new Error('Ошибка получения настроек');
      return res.json();
    },
    updateSettings: async (settings: { all: boolean, users: boolean, admins: boolean, maintenance: boolean }) => {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const adminUsername = user?.username || '';

      const res = await fetch(`${API_BASE_URL}/admin/settings`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-username': adminUsername
        },
        body: JSON.stringify(settings)
      });
      if (!res.ok) throw new Error('Ошибка сохранения настроек');
      return res.json();
    }
  }
};

// Экспортируем api как алиас для client, чтобы не сломать импорты в других местах, если они были
export const api = client;

// test deploy update