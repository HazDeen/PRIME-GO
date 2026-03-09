import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
// 1. Убираем импорт старого Toaster из sonner
// 2. Импортируем наш собственный компонент Toast (проверь, чтобы путь совпадал с тем, где ты его создал!)
import { Toast } from "./components/Toast"; 

import Login from "./pages/Login";
import Home from "./pages/Home";
import TopUp from "./pages/TopUp";
import History from "./pages/History";
import DeviceDetail from "./pages/DeviceDetail";
import Admin from "./pages/Admin";
import "./styles/app.css";
import "./styles/admin.css";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        {/* 👇 Вот он! Теперь тут работает наш умный стеклянный тостер */}
        <Toast /> 
        
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Home />} />
          <Route path="/topup" element={<TopUp />} />
          <Route path="/history" element={<History />} />
          <Route path="/device/:id" element={<DeviceDetail />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;