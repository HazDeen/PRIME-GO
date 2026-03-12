import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { useBalance } from '../hooks/useBalance';
import { useDevices } from '../hooks/useDevices';
import { useAuth } from '../context/AuthContext';
import BalanceCard from "../components/BalanceCard";
import DevicesCard from "../components/DevicesCard";
import ActionButtons from "../components/ActionButtons";
import AddDeviceModal from "../components/AddDeviceModal";
import type { DeviceType } from '../types/device';

export default function Vpn() { // <-- Переименовал функцию в Vpn (хорошая практика, если файл Vpn.tsx)
  const [showAddModal, setShowAddModal] = useState(false);
  const { addDevice } = useDevices();
  const { refetch: refetchBalance } = useBalance();
  const { user } = useAuth();
  const navigate = useNavigate();

  // 🌟 ДОБАВИЛИ 4-Й ПАРАМЕТР: location
  const handleAddDevice = async (name: string, customName: string, type: DeviceType, location: string) => {
    try {
      // 🌟 ПЕРЕДАЕМ location ДАЛЬШЕ В ХУК
      await addDevice(name, customName, type, location); 
      refetchBalance(); 
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      throw error; 
    }
  };

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
        <motion.button 
          className="themeButton" 
          onClick={() => navigate('/home')} // 🌟 ИСПРАВИЛИ НА /home
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronLeft size={24} />
        </motion.button>
        
        <h1 className="screenTitle">Prime VPN</h1>
      </div>
      
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