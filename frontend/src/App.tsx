import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Toast } from "./components/Toast"; 
import Maintenance from "./pages/Maintenance";
import { useState, useEffect } from "react";

import Login from "./pages/Login";
import Home from "./pages/Home";
import TopUp from "./pages/TopUp";
import History from "./pages/History";
import DeviceDetail from "./pages/DeviceDetail";
import Admin from "./pages/Admin";
import Services from "./pages/Services";
import Support from './pages/Support';
import TicketChat from './pages/TicketChat';
import AdminTickets from './pages/AdminTickets';
import AdminTicketChat from './pages/AdminTicketChat';
import "./styles/app.css";
import "./styles/admin.css";
import "./styles/login.css";
import { client } from "./api/client";

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

  // 🚨 ПЕРЕХВАТЧИК: Если тех. работы, и мы не пытаемся открыть /login
  if (isMaintenance && !currentPath.includes('/login')) {
    return (
      <ThemeProvider>
        <Maintenance />
      </ThemeProvider>
    );
  }

  // 🌟 ОСНОВНОЕ ПРИЛОЖЕНИЕ (Отображается в обычном режиме)
  return (
    <ThemeProvider>
      <AuthProvider>
        {/* 👇 Вот он! Теперь тут работает наш умный стеклянный тостер */}
        <Toast /> 
        
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/vpn" element={<Home />} />
          <Route path="/" element={<Services />} />
          <Route path="/topup" element={<TopUp />} />
          <Route path="/history" element={<History />} />
          <Route path="/device/:id" element={<DeviceDetail />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/support" element={<Support />} />
          <Route path="/support/:id" element={<TicketChat />} />
          <Route path="/admin/tickets" element={<AdminTickets />} />
          <Route path="/admin/tickets/:id" element={<AdminTicketChat />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;