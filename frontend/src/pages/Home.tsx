import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useBalance } from '../hooks/useBalance';
import { useDevices } from '../hooks/useDevices';
import { useAuth } from '../context/AuthContext';
import BalanceCard from "../components/BalanceCard";
import DevicesCard from "../components/DevicesCard";
import ActionButtons from "../components/ActionButtons";
import AddDeviceModal from "../components/AddDeviceModal";
import { ReactComponent as Moon } from '../assets/icons/moon.svg';
import { ReactComponent as Sun } from '../assets/icons/sun.svg';
import { ReactComponent as LogOut } from '../assets/icons/log-out.svg';
import { ReactComponent as Shield } from '../assets/icons/server.svg';
import { useTheme } from '../context/ThemeContext';
import type { DeviceType } from '../types/device';

export default function Home() {
  const [showAddModal, setShowAddModal] = useState(false);
  const { addDevice } = useDevices();
  const { refetch: refetchBalance } = useBalance();
  const { user, logout } = useAuth(); // 👈 user содержит данные из БД
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleAddDevice = async (name: string, type: DeviceType, customName: string) => {
    try {
      await addDevice(name, customName, type);
      setShowAddModal(false);
      refetchBalance();
    } catch (error: any) {
      // ошибка показывается в AddDeviceModal через toast
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleAdminClick = () => {
    navigate('/admin');
  };

  return (
    <div className="container">
      <div className="homeHeader">
        <h1 className="screenTitle">VPN</h1>
        <div className="headerButtons">
          {user?.isAdmin && (
            <button className="adminButton" onClick={handleAdminClick} title="Админ-панель">
              <Shield width={22} height={22} />
            </button>
          )}
          
          <button className="logoutButton" onClick={handleLogout} title="Выйти">
            <LogOut width={22} height={22} />
          </button>
          
          <button className="themeButton" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun width={22} height={22} /> : <Moon width={22} height={22} />}
          </button>
        </div>
      </div>
      
      <BalanceCard />
      
      <ActionButtons />
      
      <DevicesCard onAddClick={() => setShowAddModal(true)} />
      
      <AnimatePresence mode="wait">
        {showAddModal && (
          <AddDeviceModal 
            onClose={() => setShowAddModal(false)}
            onAdd={handleAddDevice}
            tgUserId={user?.telegramId?.toString() || "0"} // 👈 Telegram ID из БД
          />
        )}
      </AnimatePresence>
    </div>
  );
}