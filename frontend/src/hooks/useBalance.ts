import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const useBalance = () => {
  const [balance, setBalance] = useState(0);
  const [daysLeft, setDaysLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const { updateBalance } = useAuth();

  const fetchBalance = async () => {
    try {
      setLoading(true);
      console.log('💰 Fetching balance...');
      
      const data = await api.users.getProfile();
      console.log('✅ Balance response:', data);
      
      setBalance(data.balance);
      setDaysLeft(data.daysLeft);
      updateBalance(data.balance);
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