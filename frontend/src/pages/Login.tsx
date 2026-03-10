import React, { useState } from 'react';
import { api } from '../api/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, Eye, EyeOff, Lock, User, ShieldCheck, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom'; // 👈 Добавили хук
import '../styles/login.css'; 

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const navigate = useNavigate(); // 👈 Инициализируем навигацию
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      toast.error('Введите username и пароль');
      return;
    }

    setLoading(true);
    try {
      const response = await api.auth.login(username, password);
      
      localStorage.setItem('user', JSON.stringify(response.user));
      
      toast.success(`Добро пожаловать, ${response.user.firstName || username}!`);
      setIsSuccess(true); 
      
      // 🔥 Теперь используем правильный редирект через useNavigate
      setTimeout(() => {
        navigate('/'); // 👈 Просто указываем роут, basename подставится сам
      }, 2000); // Сократил до 2 сек, чтобы юзер меньше ждал
      
    } catch (error: any) {
      if (error.message?.includes('Пароль не установлен')) {
        toast.error('Пароль не установлен. Напишите /setpass в боте');
      } else if (error.message?.includes('Неверный пароль')) {
        toast.error('Неверный пароль');
      } else {
        toast.error(error.message || 'Ошибка входа');
      }
      setLoading(false);
    }
  };

  return (
    <div className="loginPage">
      <motion.button 
        className="loginThemeBtn"
        onClick={toggleTheme}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </motion.button>

      <div className="loginContainer">
        <motion.div 
          className="loginCard"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <AnimatePresence mode="wait">
            {!isSuccess ? (
              <motion.div 
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <div className="loginHeader">
                  <div className="loginIconWrapper">
                    <ShieldCheck size={32} className="loginHeaderIcon" />
                  </div>
                  <h1 className="loginTitle">PRIME GO Services</h1>
                  <p className="loginDescription">
                    Введите ваш Telegram username и пароль
                  </p>
                </div>
                
                <form onSubmit={handleSubmit} className="loginForm">
                  <div className="inputGroup">
                    <div className="inputIconWrapper">
                      <User size={18} />
                    </div>
                    <input
                      type="text"
                      className="loginInput"
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  
                  <div className="inputGroup">
                    <div className="inputIconWrapper">
                      <Lock size={18} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      className="loginInput"
                      placeholder="Пароль"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                    />
                    <button 
                      type="button" 
                      className="eyeButton"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1} 
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  
                  <motion.button 
                    type="submit"
                    className="loginButton"
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {loading ? (
                      <span className="loader"></span>
                    ) : (
                      <>
                        <LogIn size={20} />
                        <span>Войти</span>
                      </>
                    )}
                  </motion.button>
                </form>
                
                <div className="loginFooter">
                  <span>Нет пароля? Напишите боту:</span>
                  <a 
                    href="https://t.me/primego_vpn_bot" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="botButton"
                  >
                    @primego_vpn_bot
                  </a>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="success"
                className="successState"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
              >
                <div className="successCircle">
                  <motion.svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="checkIcon">
                    <motion.polyline 
                      points="20 6 9 17 4 12"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    />
                  </motion.svg>
                </div>
                <h2>Успешный вход!</h2>
                <p>Перенаправление...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}