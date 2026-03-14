import { useState, useEffect } from 'react';
import { api } from '../api/client';

export interface Transaction {
  time: string;
  description: string;
  amount: number;
  type: string;
  deviceName?: string;
}

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Record<string, Transaction[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await api.transactions.getAll();  // 👈 ИСПРАВЛЕНО
      setTransactions(data);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  return { transactions, loading, refetch: fetchTransactions };
};