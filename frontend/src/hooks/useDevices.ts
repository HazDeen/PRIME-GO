// frontend/src/hooks/useDevices.ts
import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { DeviceType } from '../types/device';
import { toast } from 'sonner';

const API_BASE_URL = 'https://vpn-production-702c.up.railway.app';

interface Device {
  id: number;
  name: string;
  model: string;
  type: DeviceType;
  date: string;
  isActive: boolean;
  daysLeft?: number;
  configLink: string;
  uuid: string;
  inboundId: number;
  comment?: string;
  email?: string;
}

export function useDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const data = await api.devices.getAll();
      setDevices(data);
    } catch (error) {
      console.error('❌ Ошибка загрузки устройств:', error);
    } finally {
      setLoading(false);
    }
  };

  const addDevice = async (name: string, model: string, type: DeviceType) => {
    setLoading(true);
    try {
      // 1. Получаем данные текущего юзера из localStorage
      const userStr = localStorage.getItem('user');
      if (!userStr) throw new Error('Пользователь не авторизован');
      const user = JSON.parse(userStr);

      // 2. Создаем устройство в 3x-ui через наш API
      // Бэкенд (XuiService) вернет нам UUID и Subscription URL
      const xuiResponse = await api.devices.create({
        name,
        model,
        type,
        tgUserId: user.telegramId?.toString() || user.tgId?.toString() || "0"
      });

      if (!xuiResponse.success) {
        throw new Error(xuiResponse.msg || 'Ошибка панели управления');
      }

      // 3. Теперь сохраняем это в твою Postgres БД (Prisma)
      // ВАЖНО: передаем поля точно по твоей схеме Device
      await fetch(`${API_BASE_URL}/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: user.id, // Твой Int ID из базы
          name: `${type}: ${model}`,
          type: type,
          configLink: xuiResponse.data.subscriptionUrl, // Сопоставляем поля
          isActive: true,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
      });

      toast.success('Устройство успешно создано');
      await fetchDevices(); // Обновляем список на экране
    } catch (err: any) {
      toast.error(err.message || 'Не удалось создать устройство');
    } finally {
      setLoading(false);
    }
  };

  const deleteDevice = async (deviceId: number) => {
    // Находим устройство в текущем списке, чтобы получить его UUID для 3x-ui
    const device = devices.find(d => d.id === deviceId);
    if (!device) return;

    try {
      // 1. Удаляем из 3x-ui (нужен uuid и inboundId)
      // Если в твоей БД нет UUID, его нужно будет добавить в схему Device!
      await api.devices.delete(deviceId, 1, device.uuid); 

      // 2. Локально обновляем стейт
      setDevices(prev => prev.filter(d => d.id !== deviceId));
      toast.success('Устройство удалено');
    } catch (err) {
      toast.error('Ошибка при удалении');
    }
  };

  const updateDeviceName = async (deviceId: number, newName: string, inboundId: number, uuid: string) => {
    const success = await api.devices.updateName(deviceId, newName, inboundId, uuid);
    if (success) {
      await fetchDevices();
    }
    return success;
  };

  const replaceDeviceLink = async (deviceId: number, inboundId: number, uuid: string) => {
    const newLink = await api.devices.replace(deviceId, inboundId, uuid);
    if (newLink) {
      await fetchDevices();
    }
    return newLink;
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  return {
    devices,
    loading,
    addDevice,
    deleteDevice,
    updateDeviceName,
    replaceDeviceLink,
    refetch: fetchDevices
  };
}