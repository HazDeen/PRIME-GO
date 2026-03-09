import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, LogOut, Moon, Sun } from 'lucide-react'; // 🔥 Новые красивые иконки
import { useBalance } from '../hooks/useBalance';
import { useDevices } from '../hooks/useDevices';
import { useAuth } from '../context/AuthContext';
import BalanceCard from "../components/BalanceCard";
import DevicesCard from "../components/DevicesCard";
import ActionButtons from "../components/ActionButtons";
import AddDeviceModal from "../components/AddDeviceModal";
import { useTheme } from '../context/ThemeContext';
import type { DeviceType } from '../types/device';

export default function Home() {
  const [showAddModal, setShowAddModal] = useState(false);
  const { addDevice } = useDevices();
  const { refetch: refetchBalance } = useBalance();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleAddDevice = async (name: string, customName: string, type: DeviceType) => {
    try {
      await addDevice(name, customName, type); 
      setShowAddModal(false);
      refetchBalance();
    } catch (error: any) {
      // Ошибка обработается внутри модалки
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleAdminClick = () => {
    navigate('/admin');
  };

  // Анимация для контейнера
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 }
  };

  return (
    <motion.div 
      className="container"
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="homeHeader">
        <h1 className="screenTitle">VPN</h1>
        
        <div className="headerButtons">
          {user?.isAdmin && (
            <motion.button 
              className="adminButton" 
              onClick={handleAdminClick} 
              title="Админ-панель"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ShieldCheck size={20} />
            </motion.button>
          )}
          
          <motion.button 
            className="themeButton" 
            onClick={toggleTheme}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </motion.button>

          <motion.button 
            className="logoutButton" 
            onClick={handleLogout} 
            title="Выйти"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <LogOut size={20} />
          </motion.button>
        </div>
      </div>
      
      {/* Карточки внутри автоматически получат стиль из app.css */}
      <BalanceCard />
      
      <ActionButtons />
      
      <DevicesCard onAddClick={() => setShowAddModal(true)} />
      
      <AnimatePresence mode="wait">
        {showAddModal && (
          <AddDeviceModal 
            onClose={() => setShowAddModal(false)}
            onAdd={handleAddDevice}
            tgUserId={user?.telegramId?.toString() || "0"}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}