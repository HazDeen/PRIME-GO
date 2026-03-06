// frontend/src/api/client.ts
import { toast } from 'sonner';
import type { DeviceType } from '../types/device';
import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = 'https://vpn-production-702c.up.railway.app';

export class Client {
  public api: AxiosInstance;

  constructor(baseURL: string) {
    this.api = axios.create({
      baseURL,
      withCredentials: true,
    });
  }

  // --- Методы для пользователей ---
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


// Универсальная функция для заголовков (Токен + X-Username)
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

export const api = {
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
  // --- УСТРОЙСТВА (ИСПРАВЛЕНО: Добавлены updateName и replace) ---
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
        if (!xuiResult.success) throw new Error(xuiResult.message || 'Ошибка 3x-ui');

        await fetch(`${API_BASE_URL}/devices`, {
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
        
        return xuiResult;
      } catch (error: any) {
      toast.error(error.message || 'Ошибка создания');
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

    // ВОТ ЭТИ МЕТОДЫ БЫЛИ ПРОПУЩЕНЫ:
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
};


  // --- АДМИН ПАНЕЛЬ ---
export const client = {
  // Твои существующие админские функции + новые
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
      // Оставляю твой роут, но убедись, что на бэкенде он совпадает!
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
      return response.json();
    },

    // Изменить никнейм
    updateUsername: async (userId: number, newUsername: string) => {
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/username`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ newUsername })
      });
      return response.json();
    },
    
    // Перегенерировать ссылку
    regenerateLink: async (deviceId: number) => {
      const response = await fetch(`${API_BASE_URL}/admin/devices/${deviceId}/regenerate`, {
        method: 'POST',
        headers: getHeaders()
      });
      return response.json();
    },

    // Добавить устройство от лица админа
    addDeviceForUser: async (userId: number, data: { name: string, type: string }) => {
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/devices`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      return response.json();
    },

    // ------------------------------------------------------------------
    // НОВАЯ ФУНКЦИЯ: Удаление устройства админом
    // ------------------------------------------------------------------
    deleteDevice: async (deviceId: number) => {
      const response = await fetch(`${API_BASE_URL}/admin/devices/${deviceId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      
      // Добавим небольшую проверку на случай, если бэк вернет не JSON при ошибке
      if (!response.ok) {
        throw new Error(`Ошибка удаления: ${response.status}`);
      }
      return response.json();
    }
  }
};
