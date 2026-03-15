import React, { createContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export interface User {
  id: number;
  telegramId: string;
  avatarUrl?: string | null;
  firstName: string;
  lastName: string;
  username: string;
  balance: number;
  isAdmin: boolean;
  autoRenewVpn?: boolean;
  autoRenewGemini?: boolean;
  tgNotifications?: boolean;
}

export interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  loading: boolean;
  updateBalance: (newBalance: number) => void;
  updateUser: (data: Partial<User>) => void;
  logout: () => void;
}

// 👈 Теперь мы экспортируем сам контекст
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const updateUser = (data: Partial<User>) => {
      if (user) {
        const updated = { ...user, ...data };
        setUser(updated);
        localStorage.setItem('user', JSON.stringify(updated));
      }
    };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  

  const updateBalance = (newBalance: number) => {
    if (user) {
      const updated = { ...user, balance: newBalance };
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token'); 
    setUser(null);
    navigate('/'); 
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, updateBalance, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
};