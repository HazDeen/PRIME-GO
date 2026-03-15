// frontend/src/hooks/useBalance.ts

import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from './useAuth'; // Используем новый разделенный хук

// frontend/src/hooks/useBalance.ts
export const useBalance = () => {
  const [balance, setBalance] = useState(0);
  const [daysLeft, setDaysLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Теперь эта строка не будет вызывать ошибку
  const { updateUser } = useAuth(); 

  const fetchBalance = async () => {
    try {
      setLoading(true);
      const data = await api.users.getProfile();
      
      setBalance(data.balance);
      setDaysLeft(data.daysLeft);
      
      // Обновляем и баланс, и аватарку одновременно
      updateUser({
        balance: data.balance,
        avatarUrl: data.avatarUrl
      });
    } catch (error) {
      console.error('❌ Failed to fetch balance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  return { balance, daysLeft, loading, refetch: fetchBalance };
};