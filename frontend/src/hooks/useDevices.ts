import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { DeviceType } from '../types/device';

// Убедись, что этот URL совпадает с твоим бэкендом на Railway
const API_BASE_URL = 'https://vpn-production-702c.up.railway.app';

export interface Device {
  id: number;
  name: string;      // Мы используем это как отображаемое имя
  model: string;     // Добавь это поле
  type: DeviceType;
  configLink: string;
  uuid?: string;
  isActive: boolean;
  expiresAt: string;
  date: string;      // Добавь это поле (мы его мапим в сервисе из connectedAt)
  daysLeft?: number;
}

export function useDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Функция загрузки устройств
  const fetchDevices = useCallback(async () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      setLoading(false);
      return;
    }

    try {
      const user = JSON.parse(userStr);
      // Стучимся на новый эндпоинт: /devices/user/:tgId
      const response = await fetch(`${API_BASE_URL}/devices/user/${user.telegramId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Не удалось загрузить устройства');

      const data = await response.json();
      setDevices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('❌ Error fetching devices:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Функция создания устройства (ОДИН ЗАПРОС)
  const addDevice = async (name: string, customName: string, type: DeviceType) => {
    setLoading(true);
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) throw new Error('Пользователь не авторизован');
      const user = JSON.parse(userStr);

      // Отправляем данные на ОДИН эндпоинт /devices
      const response = await fetch(`${API_BASE_URL}/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          tgId: user.telegramId.toString(),
          name: name,         // Модель (например, iPhone 15)
          customName: customName, // Название (например, Мой телефон)
          type: type          // Тип устройства
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Если на бэкенде не хватило денег или ошибка в XUI, выкидываем ошибку
        throw new Error(result.message || 'Ошибка при создании устройства');
      }

      toast.success('✅ Устройство успешно создано!');
      
      // Сразу обновляем список устройств, чтобы увидеть новое
      await fetchDevices();
      
    } catch (err: any) {
      toast.error(err.message || 'Не удалось создать устройство');
      throw err; // Пробрасываем ошибку в модалку, чтобы она не закрылась
    } finally {
      setLoading(false);
    }
  };

  // 3. Функция удаления устройства
  const deleteDevice = async (deviceId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/devices/${deviceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Ошибка при удалении');

      setDevices(prev => prev.filter(d => d.id !== deviceId));
      toast.success('Устройство удалено');
    } catch (err) {
      toast.error('Не удалось удалить устройство');
    }
  };

  // Первичная загрузка при монтировании
  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  return {
    devices,
    loading,
    addDevice,
    deleteDevice,
    refetch: fetchDevices
  };
}