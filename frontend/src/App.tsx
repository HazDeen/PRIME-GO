import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Toast } from "./components/Toast"; 
import Maintenance from "./pages/Maintenance";
import { useState, useEffect } from "react";

import Login from "./pages/Login";
import Vpn from "./pages/Vpn";
import TopUp from "./pages/TopUp";
import History from "./pages/History";
import DeviceDetail from "./pages/DeviceDetail";
import Admin from "./pages/Admin";
import Services from "./pages/Services";
import Support from './pages/Support';
import TicketChat from './pages/TicketChat';
import AdminTickets from './pages/AdminTickets';
import AdminTicketChat from './pages/AdminTicketChat';
import Gemini from "./pages/Gemini";
import "./styles/app.css";
import "./styles/admin.css";
import "./styles/login.css";
import { client } from "./api/client";

// ==========================================
// 🛡️ ЗАЩИТА РОУТОВ (ПРОВЕРКА АВТОРИЗАЦИИ)
// ==========================================

// 1. Не пускаем неавторизованных внутрь
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const user = localStorage.getItem('user');
  if (!user) {
    return <Navigate to="/" replace />; // Кидаем на логин
  }
  return children;
};

// 2. Не пускаем авторизованных обратно на страницу входа
const PublicRoute = ({ children }: { children: JSX.Element }) => {
  const user = localStorage.getItem('user');
  if (user) {
    return <Navigate to="/home" replace />; // Кидаем сразу в сервисы
  }
  return children;
};

// ==========================================

function App() {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const currentPath = window.location.hash || window.location.pathname;

  useEffect(() => {
    client.system.getStatus()
      .then((res: any) => {
        // Если тех. работы ВКЛЮЧЕНЫ, и пользователь НЕ админ
        if (res.maintenance && !user?.isAdmin) {
          setIsMaintenance(true);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return null; // Или красивый полноэкранный лоадер

  // 🚨 ПЕРЕХВАТЧИК: Если тех. работы, и мы не пытаемся открыть логин (который теперь на /)
  if (isMaintenance && currentPath !== '/' && !currentPath.toLowerCase().includes('login')) {
    return (
      <ThemeProvider>
        <Maintenance />
      </ThemeProvider>
    );
  }

  // 🌟 ОСНОВНОЕ ПРИЛОЖЕНИЕ
  return (
    <ThemeProvider>
      <AuthProvider>
        <Toast /> 
        
        <Routes>
          {/* 🚪 ПУБЛИЧНАЯ СТРАНИЦА (ЛОГИН ТЕПЕРЬ ТУТ) */}
          <Route path="/" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />
          {/* На всякий случай делаем редирект со старого /login */}
          <Route path="/login" element={<Navigate to="/" replace />} />

          {/* 🛡️ ЗАЩИЩЕННЫЕ СТРАНИЦЫ ПРИЛОЖЕНИЯ */}
          {/* Главное меню сервисов переехало на /home */}
          <Route path="/home" element={<ProtectedRoute><Services /></ProtectedRoute>} />
          
          <Route path="/vpn" element={<ProtectedRoute><Vpn /></ProtectedRoute>} />
          <Route path="/gemini" element={<ProtectedRoute><Gemini /></ProtectedRoute>} />
          <Route path="/topup" element={<ProtectedRoute><TopUp /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
          <Route path="/device/:id" element={<ProtectedRoute><DeviceDetail /></ProtectedRoute>} />
          <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
          <Route path="/support/:id" element={<ProtectedRoute><TicketChat /></ProtectedRoute>} />
          
          {/* 🛡️ АДМИНКА */}
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route path="/admin/tickets" element={<ProtectedRoute><AdminTickets /></ProtectedRoute>} />
          <Route path="/admin/tickets/:id" element={<ProtectedRoute><AdminTicketChat /></ProtectedRoute>} />

          {/* Если юзер введет несуществующую ссылку — кидаем на главную */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;