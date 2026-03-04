// frontend/src/hooks/useDevices.ts
import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { DeviceType } from '../types/device';

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
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const tgUserId = user.telegramId || user.tgId || '0';
      
      const result = await api.devices.create({
        name,
        model,
        type,
        tgUserId
      });
      
      if (result.success) {
        await fetchDevices(); // Перезагружаем список
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Ошибка добавления:', error);
      return false;
    }
  };

  const deleteDevice = async (deviceId: number, inboundId: number, uuid: string) => {
    const success = await api.devices.delete(deviceId, inboundId, uuid);
    if (success) {
      await fetchDevices();
    }
    return success;
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