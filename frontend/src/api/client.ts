// frontend/src/api/client.ts
import { toast } from 'sonner';
import type { DeviceType } from '../types/device';

const API_BASE_URL = 'https://vpn-production-702c.up.railway.app';


export const api = {
  // 🔵 ВСЁ ЧТО СВЯЗАНО С ПОЛЬЗОВАТЕЛЯМИ - ОСТАЁТСЯ КАК ЕСТЬ
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

  // 🔵 ВСЁ ЧТО СВЯЗАНО С ТРАНЗАКЦИЯМИ - ОСТАЁТСЯ КАК ЕСТЬ
  transactions: {
    getAll: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/transactions`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`
        }
      });
      return response.json();
    },
    create: async (data: any) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify(data)
      });
      return response.json();
    }
  },

  // 🔵 ВСЁ ЧТО СВЯЗАНО С БАЛАНСОМ - ОСТАЁТСЯ КАК ЕСТЬ
  balance: {
    get: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/balance`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`
        }
      });
      return response.json();
    },
    topup: async (amount: number) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/balance/topup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({ amount })
      });
      return response.json();
    }
  },

  // 🔴 УСТРОЙСТВА - ТЕПЕРЬ ПОЛУЧАЕМ С СЕРВЕРА 3X-UI, НО СОХРАНЯЕМ В БД ДЛЯ ИСТОРИИ
  devices: {
    // Получить все устройства пользователя (с сервера 3x-ui)
    getAll: async () => {
      try {
        const userStr = localStorage.getItem('user');
        if (!userStr) return [];
        
        const user = JSON.parse(userStr);
        const tgUserId = user.telegramId || user.tgId || '0';
        
        const response = await fetch(`${API_BASE_URL}/xui/user-devices/${tgUserId}`);
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
            comment: device.comment || '',
            email: device.email || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }));
        }
        
        const cached = localStorage.getItem('devices');
        return cached ? JSON.parse(cached) : [];
      } catch (error) {
        console.error('❌ Ошибка загрузки устройств с сервера:', error);
        const cached = localStorage.getItem('devices');
        return cached ? JSON.parse(cached) : [];
      }
    },

    // Создать устройство (и в 3x-ui, и в БД)
    create: async (data: {
      name: string;
      model: string;
      type: DeviceType;
      tgUserId: string;
    }) => {
      try {
        const response = await fetch(`${API_BASE_URL}/xui/client`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inboundId: 1,
            tgUid: data.tgUserId,
            email: Math.random().toString(36).substring(2, 10),
            flow: 'xtls-rprx-vision',
            totalGb: 100,
            expiryTime: Date.now() + 30 * 24 * 60 * 60 * 1000,
            comment: `${data.type}: ${data.model}`
          })
        });

        const xuiResult = await response.json();
        
        if (!xuiResult.success) {
          throw new Error(xuiResult.message || 'Ошибка создания в 3x-ui');
        }

        const token = localStorage.getItem('token');
        if (token) {
          await fetch(`${API_BASE_URL}/devices`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              name: data.name,
              model: data.model,
              type: data.type,
              uuid: xuiResult.data.uuid,
              subscriptionUrl: xuiResult.data.subscriptionUrl,
              tgUserId: data.tgUserId
            })
          });
        }
        
        const devices = await api.devices.getAll();
        localStorage.setItem('devices', JSON.stringify(devices));
        
        return xuiResult;
      } catch (error) {
        console.error('❌ Ошибка создания устройства:', error);
        throw error;
      }
    },

    // Удалить устройство (из 3x-ui и из БД)
    delete: async (deviceId: number, inboundId: number, uuid: string) => {
      try {
        const response = await fetch(`${API_BASE_URL}/xui/client/delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inboundId, uuid })
        });

        const xuiResult = await response.json();
        
        if (!xuiResult.success) {
          throw new Error(xuiResult.message || 'Ошибка удаления из 3x-ui');
        }

        const token = localStorage.getItem('token');
        if (token) {
          await fetch(`${API_BASE_URL}/devices/${deviceId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
        }

        const devices = await api.devices.getAll();
        localStorage.setItem('devices', JSON.stringify(devices));
        
        toast.success('✅ Устройство удалено из 3x-ui');
        return true;
      } catch (error) {
        console.error('❌ Ошибка удаления:', error);
        toast.error('❌ Не удалось удалить устройство');
        return false;
      }
    },

    // Обновить имя устройства (комментарий в 3x-ui и в БД)
    updateName: async (deviceId: number, newName: string, inboundId: number, uuid: string) => {
      try {
        const response = await fetch(`${API_BASE_URL}/xui/client/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            inboundId, 
            uuid, 
            comment: newName 
          })
        });

        const xuiResult = await response.json();
        
        if (!xuiResult.success) {
          throw new Error(xuiResult.message || 'Ошибка обновления в 3x-ui');
        }

        const token = localStorage.getItem('token');
        if (token) {
          await fetch(`${API_BASE_URL}/devices/${deviceId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name: newName })
          });
        }

        const devices = await api.devices.getAll();
        localStorage.setItem('devices', JSON.stringify(devices));
        
        toast.success('✅ Название обновлено');
        return true;
      } catch (error) {
        console.error('❌ Ошибка обновления:', error);
        toast.error('❌ Не удалось обновить название');
        return false;
      }
    },

    // Заменить ссылку (сгенерировать новый subId в 3x-ui)
    replace: async (deviceId: number, inboundId: number, uuid: string) => {
      try {
        const response = await fetch(`${API_BASE_URL}/xui/client/replace-link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inboundId, uuid })
        });

        const data = await response.json();
        
        if (data.success) {
          const token = localStorage.getItem('token');
          if (token) {
            await fetch(`${API_BASE_URL}/devices/${deviceId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ 
                subscriptionUrl: data.data.newSubscriptionUrl 
              })
            });
          }

          const devices = await api.devices.getAll();
          localStorage.setItem('devices', JSON.stringify(devices));
          
          toast.success('✅ Новая ссылка сгенерирована');
          return data.data.newSubscriptionUrl;
        } else {
          toast.error(data.message || '❌ Ошибка генерации ссылки');
          return null;
        }
      } catch (error) {
        console.error('❌ Ошибка замены ссылки:', error);
        toast.error('❌ Не удалось подключиться к серверу');
        return null;
      }
    },

    // Получить одно устройство
    getById: async (deviceId: number) => {
      const devices = await api.devices.getAll();
      return devices.find((d: any) => d.id === deviceId);
    }
  },

  // 🔵 ПОЛЬЗОВАТЕЛИ - ОСТАЁТСЯ КАК ЕСТЬ
  users: {
    getProfile: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`
        }
      });
      return response.json();
    },
    updateProfile: async (data: any) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify(data)
      });
      return response.json();
    }
  },

  // 🔵 АДМИНКА - ОСТАЁТСЯ КАК ЕСТЬ
  admin: {
  getStats: async () => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/admin/stats`, {
      headers: {
        'Authorization': `Bearer ${token || ''}`
      }
    });
    return response.json();
  },
  getUsers: async () => {  // 👈 ВМЕСТО getAllUsers
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      headers: {
        'Authorization': `Bearer ${token || ''}`
      }
    });
    return response.json();
  },
  // Добавь другие методы по необходимости
  getUserDevices: async (userId: number) => {
    const devices = await api.devices.getAll();
    // Фильтруем по userId если нужно
    console.log('Загрузка устройств для пользователя:', userId);
    return devices;
  }
},
}