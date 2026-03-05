import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { client } from '../api/client';
import { toast } from 'sonner';
import { ReactComponent as Apple } from '../assets/icons/apple.svg';
import { ReactComponent as Android } from '../assets/icons/android.svg';
import { ReactComponent as Monitor } from '../assets/icons/monitor.svg';
import '../styles/admin.css';
import '../styles/app.css';

const DEVICE_TYPES = [
  { id: "apple", label: "iPhone", icon: Apple },
  { id: "android", label: "Android", icon: Android },
  { id: "desktop", label: "PC/Mac", icon: Monitor },
];

const Admin: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [selectedTgId, setSelectedTgId] = useState('');
  
  const [newTgId, setNewTgId] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [selectedType, setSelectedType] = useState('apple');

  const fetchData = async () => {
    setLoading(true);
    try {
      const u = await client.admin.getUsers();
      const d = await client.admin.getAllDevices();
      setUsers(u || []);
      setDevices(d || []);
    } catch (e) {
      toast.error("Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateUser = async () => {
    if(!newTgId) return toast.error("Введите ID");
    setLoading(true);
    try {
      await client.admin.createUser({ telegramId: newTgId, balance: 0 });
      toast.success("Пользователь добавлен");
      setShowUserModal(false);
      setNewTgId('');
      fetchData();
    } catch (e) { 
      toast.error("Ошибка создания"); 
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDevice = async () => {
    if(!deviceName) return toast.error("Введите название");
    setLoading(true);
    try {
      await client.admin.createDevice({ tgId: selectedTgId, name: deviceName, type: selectedType });
      toast.success("Устройство добавлено");
      setShowDeviceModal(false);
      setDeviceName('');
      fetchData();
    } catch (e) { 
      toast.error("Ошибка создания"); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`adminPage ${loading ? 'loading-state' : ''}`}>
      <header className="adminHeader">
        <h1>Админ-центр</h1>
        <button className="mainBtn" disabled={loading} onClick={() => setShowUserModal(true)}>
          {loading ? '...' : '+ Пользователь'}
        </button>
      </header>

      {/* Список пользователей */}
      <section className="adminSection">
        <h2 className="sectionTitle">Пользователи ({users.length})</h2>
        <div className="userList">
          {users.map(user => (
            <div key={user.id} className="userCard">
              <div className="userInfo">
                <span className="userTg">ID: {user.telegramId}</span>
                <span className="userBalance">{user.balance} ₽</span>
              </div>
              <button className="addDeviceBtn" onClick={() => {
                setSelectedTgId(user.telegramId.toString());
                setShowDeviceModal(true);
              }}>+ VPN</button>
            </div>
          ))}
        </div>
      </section>

      {/* Список устройств — ТЕПЕРЬ ОН ИСПОЛЬЗУЕТ devices */}
      <section className="adminSection">
        <h2 className="sectionTitle">Активные VPN ({devices.length})</h2>
        <div className="deviceList">
          {devices.map(device => (
            <div key={device.id} className="deviceCardMini">
              <div className="deviceInfo">
                <span className="deviceName">{device.name}</span>
                <span className="deviceEmail">{device.email}</span>
              </div>
              <div className="deviceStatus">
                {device.isActive ? <span className="statusOn">●</span> : <span className="statusOff">○</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Модалки остаются без изменений, но теперь логика создания использует setLoading(true/false) */}
      <AnimatePresence>
        {showUserModal && (
          <div className="modalOverlay" onClick={() => setShowUserModal(false)}>
            <motion.div className="modalSheet" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} onClick={e => e.stopPropagation()}>
              <div className="modalHandle" />
              <h2 className="modalTitle">Новый пользователь</h2>
              <input className="modalInput" placeholder="Telegram ID" value={newTgId} onChange={e => setNewTgId(e.target.value)} />
              <button className="modalSubmitBtn" disabled={loading} onClick={handleCreateUser}>
                {loading ? 'Создание...' : 'Подтвердить'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeviceModal && (
          <div className="modalOverlay" onClick={() => setShowDeviceModal(false)}>
            <motion.div className="modalSheet" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} onClick={e => e.stopPropagation()}>
              <div className="modalHandle" />
              <h2 className="modalTitle">Добавить устройство</h2>
              <input className="modalInput" placeholder="Название" value={deviceName} onChange={e => setDeviceName(e.target.value)} />
              <div className="deviceTypeGrid">
                {DEVICE_TYPES.map(t => (
                  <button key={t.id} className={`deviceTypeBtn ${selectedType === t.id ? 'active' : ''}`} onClick={() => setSelectedType(t.id)}>
                    <t.icon />
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
              <button className="modalSubmitBtn" disabled={loading} onClick={handleCreateDevice}>
                {loading ? 'Связываюсь с 3x-ui...' : 'Добавить'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Admin;