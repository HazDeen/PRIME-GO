import { toast } from 'sonner';
import type { DeviceType } from '../types/device';

const API_BASE_URL = 'https://h4zdeen.up.railway.app'; // ссылка на backend

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

// Экспортируем наш основной объект API (Обязательно export const client)
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

    create: async (data: { name: string; model: string; type: DeviceType; tgUserId: string; location?: string }) => {
      if (isCreatingDevice) return;
      isCreatingDevice = true;
      try {
        // Отправляем ОДИН запрос на бэкенд
        const response = await fetch(`${API_BASE_URL}/devices`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            name: data.name,
            model: data.model,
            type: data.type,
            location: data.location || 'ch',
            tgUserId: data.tgUserId
            // uuid, email и subscriptionUrl фронтенду генерировать и знать до ответа не нужно!
          })
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || 'Ошибка создания устройства');
        }
        
        return result; // Бэкенд возвращает уже готовые данные и из БД, и из XUI
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
    // 👇 НОВАЯ ФУНКЦИЯ: Обновление логина
    updateUsername: async (newUsername: string) => {
      const response = await fetch(`${API_BASE_URL}/user/username`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ newUsername })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Ошибка обновления логина');
      return data;
    },
    // 👇 НОВАЯ ФУНКЦИЯ: Обновление пароля
    updatePassword: async (oldPassword: string, newPassword: string) => {
      const response = await fetch(`${API_BASE_URL}/user/password`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Ошибка обновления пароля');
      return data;
    }
  },

  // --- ПЛАТЕЖИ ---
  payments: {
    create: async (amount: number) => {
      const tgId = JSON.parse(localStorage.getItem('user') || '{}').telegramId;
      const res = await fetch(`${API_BASE_URL}/payments/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-telegram-id': String(tgId) },
        body: JSON.stringify({ amount }) 
      });
      if (!res.ok) throw new Error('Ошибка создания платежа');
      return res.json();
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
    createDevice: async (data: { tgId: string; name: string; type: string; location?: string }) => {
      const response = await fetch(`${API_BASE_URL}/devices`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      const result = await response.json();
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
    addDeviceForUser: async (userId: number, data: { name: string; type: string; location: string }) => {
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/devices`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      const result = await response.json();
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
    updateSettings: async (settings: { all: boolean, users: boolean, admins: boolean, maintenance: boolean, blockCh: boolean, blockAt: boolean}) => {
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
    },
    sendNotification: async (data: { userIds?: number[], sendToAll: boolean, title: string, message: string }) => {
      const response = await fetch(`${API_BASE_URL}/admin/notifications`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Ошибка отправки уведомления');
      return result;
    },
  }
};

// Экспортируем алиас api, чтобы в старых файлах (например в Login.tsx) не ломался импорт
export const api = client;