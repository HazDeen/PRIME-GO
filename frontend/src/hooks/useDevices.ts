import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { DeviceType } from '../types/device';

// Убедись, что этот URL совпадает с твоим бэкендом на Railway
const API_BASE_URL = 'https://h4zdeen.up.railway.app';

export interface Device {
  id: number;
  name: string;      
  model: string;     
  type: DeviceType;
  configLink: string;
  uuid?: string;
  isActive: boolean;
  expiresAt: string;
  date: string;      
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

  // 2. Функция создания устройства (С ПОДДЕРЖКОЙ ЛОКАЦИИ)
  const addDevice = async (name: string, customName: string, type: DeviceType, location: string) => { // 👈 Добавили location
    setLoading(true);
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) throw new Error('Пользователь не авторизован');
      const user = JSON.parse(userStr);

      const response = await fetch(`${API_BASE_URL}/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          tgId: user.telegramId.toString(),
          name: name,         
          customName: customName, 
          type: type,          
          location: location  // 👈 Передаем локацию на бэкенд
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Ошибка при создании устройства');
      }
      
      await fetchDevices();
      
    } catch (err: any) {
      throw err; 
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