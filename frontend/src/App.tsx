import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Toast } from "./components/Toast"; 

import AppView from './pages/AppView';
import Admin from "./pages/Admin";
import AdminTickets from './pages/AdminTickets';
import AdminTicketChat from './pages/AdminTicketChat';

import "./styles/app.css";
import "./styles/admin.css";
import "./styles/login.css";

// ==========================================
// 🛡️ ЗАЩИТА АДМИНКИ
// ==========================================
// Нам больше не нужны PublicRoute и ProtectedRoute для юзеров, 
// так как AppView сам плавно покажет логин или тех. работы кому надо.
// Оставляем защиту только для админских путей.

const AdminRoute = ({ children }: { children: JSX.Element }) => {
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  
  if (!user || !user.isAdmin) {
    return <Navigate to="/" replace />; // Если не админ, кидаем в AppView
  }
  return children;
};

// ==========================================

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Toast /> 
        
        <Routes>
          {/* 🌟 ВСЁ ПОЛЬЗОВАТЕЛЬСКОЕ ПРИЛОЖЕНИЕ (SPA) */}
          {/* AppView сам разберется: показать логин, тех. работы или интерфейс */}
          <Route path="/" element={<AppView />} />

          {/* 🛡️ АДМИНКА (Оставляем классический роутинг) */}
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
          <Route path="/admin/tickets" element={<AdminRoute><AdminTickets /></AdminRoute>} />
          <Route path="/admin/tickets/:id" element={<AdminRoute><AdminTicketChat /></AdminRoute>} />

          {/* Перехватываем все старые роуты (типа /login, /home, /vpn) 
              и мягко кидаем юзера в наш новый AppView */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;