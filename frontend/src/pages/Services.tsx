import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { client } from '../api/client';
import { toast } from 'sonner';
import { 
  Shield, Sparkles, User, LogOut, 
  Moon, Sun, ShieldAlert, ChevronRight,
  X, Copy, Key, Bell
} from 'lucide-react';
import '../styles/app.css';

export default function Services() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  
  // Состояния для меню и профиля
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileModal, setIsProfileModal] = useState(false);
  
  // Состояния для инпутов в профиле
  const [newPassword, setNewPassword] = useState('');
  const [tgNotifications, setTgNotifications] = useState(true); // Тумблер уведомлений

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const handleLogout = async () => {
    await client.auth.logout();
    navigate('/login');
  };

  const copyId = () => {
    navigator.clipboard.writeText(String(user?.telegramId || user?.id || ''));
    toast.success('ID скопирован в буфер обмена');
  };

  const handleSaveProfile = async () => {
    // Здесь позже можно будет прикрутить реальный запрос к API
    // await client.users.updateProfile({ password: newPassword, notifications: tgNotifications });
    
    toast.success('Настройки профиля сохранены!');
    setNewPassword('');
    setIsProfileModal(false);
  };

  const openProfile = () => {
    setIsMenuOpen(false);
    setIsProfileModal(true);
  };

  return (
    <div className="container" style={{ paddingTop: '20px' }}>
      
      {/* 🌟 ШАПКА И МЕНЮ ПРОФИЛЯ */}
      <div className="servicesHeader">
        <div className="logoGroup">
          <h1 className="primeGoTitle">PRIME GO</h1>
          <span className="primeGoSubtitle">СЕРВИСЫ</span>
        </div>

        <div className="profileMenuContainer">
          <motion.button 
            className="profileCircleBtn"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <User size={24} />
          </motion.button>

          <AnimatePresence>
            {isMenuOpen && (
              <>
                <div className="menuBackdrop" onClick={() => setIsMenuOpen(false)} />
                <motion.div 
                  className="profileDropdown"
                  initial={{ opacity: 0, scale: 0.9, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="dropdownHeader">
                    <div className="dropdownName">{user?.username || 'Пользователь'}</div>
                    <div className="dropdownId">ID: {user?.telegramId || '...'}</div>
                  </div>

                  <div className="dropdownDivider" />

                  {/* КНОПКА ОТКРЫТИЯ ПРОФИЛЯ */}
                  <button className="dropdownItem" onClick={openProfile}>
                    <User size={18} /> Мой профиль
                  </button>

                  <button className="dropdownItem" onClick={toggleTheme}>
                    <motion.div 
                      initial={false}
                      animate={{ rotate: theme === 'dark' ? 0 : 180 }}
                      transition={{ duration: 0.4 }}
                      style={{ display: 'flex' }}
                    >
                      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </motion.div>
                    Сменить тему
                  </button>

                  {user?.isAdmin && (
                    <button className="dropdownItem admin" onClick={() => navigate('/admin')}>
                      <ShieldAlert size={18} /> Админ панель
                    </button>
                  )}

                  <div className="dropdownDivider" />

                  <button className="dropdownItem logout" onClick={handleLogout}>
                    <LogOut size={18} /> Выйти
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 🚀 КАРТОЧКИ СЕРВИСОВ */}
      <div className="servicesGrid">
        <motion.div 
          className="serviceCard vpnCard"
          onClick={() => navigate('/vpn')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="serviceIconWrapper">
            <Shield size={32} />
          </div>
          <div className="serviceContent">
            <h2>Prime VPN</h2>
            <p>Безопасный и быстрый доступ в интернет</p>
          </div>
          <ChevronRight className="serviceArrow" size={24} />
        </motion.div>

        <motion.div 
          className="serviceCard geminiCard"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="serviceIconWrapper ai">
            <Sparkles size={32} />
          </div>
          <div className="serviceContent">
            <h2>Gemini AI</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <p style={{ margin: 0 }}>Умный помощник</p>
              <div className="statusBadge inDevelopment">
                <Sparkles size={14} /> В разработке
              </div>
            </div>
          </div>
          <ChevronRight className="serviceArrow" size={24} />
        </motion.div>
      </div>

      {/* 👤 ОКНО "МОЙ ПРОФИЛЬ" */}
      <AnimatePresence>
        {isProfileModal && (
          <div className="modalOverlay center" onClick={() => setIsProfileModal(false)}>
            <motion.div 
              className="confirmModal" 
              style={{ padding: '32px 24px' }}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
            >
              {/* Кнопка закрытия */}
              <button 
                className="cancelDeleteBtn" 
                style={{ top: '16px', right: '16px', border: 'none', background: 'var(--bg-input)', color: 'var(--text-secondary)' }}
                onClick={() => setIsProfileModal(false)}
              >
                <X size={18} />
              </button>

              {/* Аватарка и инфа */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
                <div className="deviceProfileIcon" style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '16px' }}>
                  <User size={36} />
                </div>
                <h2 className="modalTitle" style={{ marginBottom: '4px' }}>{user?.username || 'Пользователь'}</h2>
                
                <div 
                  onClick={copyId}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-tertiary)', fontSize: '14px', cursor: 'pointer', background: 'var(--bg-input)', padding: '4px 12px', borderRadius: '12px' }}
                >
                  ID: {user?.telegramId || '...'} <Copy size={12} />
                </div>
              </div>

              {/* Тумблер уведомлений (стиль из админки) */}
              <div className="extraSettingsPanel" style={{ marginBottom: '20px', textAlign: 'left' }}>
                <div className="restrictionItem">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                    <Bell size={18} /> Уведомления в Telegram
                  </span>
                  <label className="premiumSwitch">
                    <input 
                      type="checkbox" 
                      checked={tgNotifications} 
                      onChange={() => setTgNotifications(!tgNotifications)} 
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>

              {/* Смена пароля */}
              <div style={{ textAlign: 'left', marginBottom: '24px' }}>
                <label className="modalLabel" style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Key size={16} /> Сменить пароль
                </label>
                <input 
                  type="password"
                  className="modalInput" 
                  placeholder="Введите новый пароль..." 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ marginBottom: 0, textAlign: 'left' }}
                />
              </div>

              {/* Кнопка сохранения */}
              <button 
                className="modalSubmitBtn" 
                style={{ width: '100%', padding: '16px' }}
                onClick={handleSaveProfile}
              >
                Сохранить изменения
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}