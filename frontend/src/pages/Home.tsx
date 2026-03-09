import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft } from 'lucide-react'; // 🔥 Новые красивые иконки
import { useBalance } from '../hooks/useBalance';
import { useDevices } from '../hooks/useDevices';
import { useAuth } from '../context/AuthContext';
import BalanceCard from "../components/BalanceCard";
import DevicesCard from "../components/DevicesCard";
import ActionButtons from "../components/ActionButtons";
import AddDeviceModal from "../components/AddDeviceModal";
import type { DeviceType } from '../types/device';

export default function Home() {
  const [showAddModal, setShowAddModal] = useState(false);
  const { addDevice } = useDevices();
  const { refetch: refetchBalance } = useBalance();
  const { user } = useAuth();
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
      <div className="homeHeader" style={{ justifyContent: 'flex-start', gap: '16px' }}>
        {/* Кнопка НАЗАД в главное меню */}
        <motion.button 
          className="themeButton" /* Используем старый класс для красивого стеклянного квадратика */
          onClick={() => navigate('/')} 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronLeft size={24} />
        </motion.button>
        
        <h1 className="screenTitle">Prime VPN</h1>
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