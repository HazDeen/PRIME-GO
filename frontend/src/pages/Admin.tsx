import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { client } from '../api/client';
import { toast } from 'sonner';
import { 
  Plus, Wallet, ShieldCheck, ShieldAlert, 
  Trash2, Copy, ChevronDown, LogOut, Monitor, Smartphone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../styles/admin.css';

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Состояния раскрытия
  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const [expandedDevice, setExpandedDevice] = useState<number | null>(null);

  // Универсальное состояние для подтверждений
  const [confirmModal, setConfirmModal] = useState<{
    type: 'balance' | 'name' | 'deleteDevice' | 'admin' | 'addDevice' | null,
    title: string,
    data?: any,
    inputValue?: string
  } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const u = await client.admin.getUsers();
      const d = await client.admin.getAllDevices();
      setUsers(u || []);
      setDevices(d || []);
    } catch (e) { toast.error("Ошибка загрузки"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // Выполнение действий после подтверждения
  const handleConfirmAction = async () => {
    if (!confirmModal) return;
    setLoading(true);
    try {
      switch (confirmModal.type) {
        case 'balance':
          await client.admin.updateUserBalance(confirmModal.data.id, parseFloat(confirmModal.inputValue || '0'));
          toast.success("Баланс изменен");
          break;
        case 'admin':
          await client.admin.setAdminStatus(confirmModal.data.id, !confirmModal.data.isAdmin);
          toast.success("Права обновлены");
          break;
        case 'deleteDevice':
          // await client.admin.deleteDevice(confirmModal.data.id); 
          toast.success("Устройство удалено");
          break;
      }
      fetchData();
      setConfirmModal(null);
    } catch (e) { toast.error("Ошибка операции"); }
    finally { setLoading(false); }
  };

  return (
    <div className="adminContainer">
      <motion.button className="exitBtn" whileTap={{ scale: 0.9 }} onClick={() => navigate('/')}>
        <LogOut size={20} />
      </motion.button>

      <div className="adminHeaderRow">
        <h1 className="mainTitle">Админ-панель</h1>
        <button className="addBtnCompact" onClick={() => setConfirmModal({ type: 'addDevice', title: 'Новое устройство' })}>
          <Plus size={18} /> <span>Добавить VPN</span>
        </button>
      </div>

      <div className="adminGrid">
        {/* Пользователи */}
        <div className="adminColumn">
          <h2 className="columnLabel">Пользователи</h2>
          {users.map(user => (
            <div key={user.id} className="customCard">
              <div className="cardMainRow" onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}>
                <div className="userIcon">{user.isAdmin ? <ShieldCheck size={20}/> : <Smartphone size={20}/>}</div>
                <div className="cardInfo">
                  <div className="primaryText">{user.username || `@id${user.telegramId}`}</div>
                  <div className="secondaryText">{user.balance} ₽ • {user.isAdmin ? 'Админ' : 'Клиент'}</div>
                </div>
                <motion.div animate={{ rotate: expandedUser === user.id ? 180 : 0 }}><ChevronDown size={20}/></motion.div>
              </div>
              <AnimatePresence>
                {expandedUser === user.id && (
                  <motion.div className="cardDropdown" initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}>
                    <button className="dropItem" onClick={() => setConfirmModal({ type: 'balance', title: 'Изменить баланс', data: user, inputValue: '0' })}>
                      <Wallet size={14}/> Изменить баланс
                    </button>
                    <button className="dropItem" onClick={() => setConfirmModal({ type: 'admin', title: 'Сменить права', data: user })}>
                      <ShieldAlert size={14}/> {user.isAdmin ? 'Снять админа' : 'Сделать админом'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Устройства */}
        <div className="adminColumn">
          <h2 className="columnLabel">Активные VPN</h2>
          {devices.map(device => (
            <div key={device.id} className="customCard">
              <div className="cardMainRow" onClick={() => setExpandedDevice(expandedDevice === device.id ? null : device.id)}>
                <div className="deviceIcon"><Monitor size={20}/></div>
                <div className="cardInfo">
                  <div className="primaryText">{device.name}</div>
                  <div className="secondaryText">{device.email}</div>
                </div>
                <motion.div animate={{ rotate: expandedDevice === device.id ? 180 : 0 }}><ChevronDown size={20}/></motion.div>
              </div>
              <AnimatePresence>
                {expandedDevice === device.id && (
                  <motion.div className="cardDropdown" initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}>
                    <button className="dropItem" onClick={() => { navigator.clipboard.writeText(device.subscriptionUrl); toast.success("Скопировано"); }}>
                      <Copy size={14}/> Копировать ссылку
                    </button>
                    <button className="dropItem delete" onClick={() => setConfirmModal({ type: 'deleteDevice', title: 'Удалить устройство?', data: device })}>
                      <Trash2 size={14}/> Удалить VPN
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* УНИВЕРСАЛЬНАЯ МОДАЛКА ПОДТВЕРЖДЕНИЯ */}
      <AnimatePresence>
        {confirmModal && (
          <div className="modalOverlay" onClick={() => setConfirmModal(null)}>
            <motion.div 
              className="confirmModal" 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }}
              onClick={e => e.stopPropagation()}
            >
              <h2 className="modalTitle">{confirmModal.title}</h2>
              <p className="modalSub">Выполнить действие для {confirmModal.data?.username || confirmModal.data?.name || 'выбранного объекта'}?</p>
              
              {(confirmModal.type === 'balance' || confirmModal.type === 'name') && (
                <input 
                  className="modalInput" 
                  autoFocus
                  value={confirmModal.inputValue} 
                  onChange={e => setConfirmModal({...confirmModal, inputValue: e.target.value})}
                  placeholder="Введите значение..."
                />
              )}

              <div className="modalBtnGroup">
                <button className="modalBtn secondary" onClick={() => setConfirmModal(null)}>Отмена</button>
                <button 
                  className={`modalBtn ${confirmModal.type === 'deleteDevice' ? 'danger' : 'primary'}`} 
                  onClick={handleConfirmAction}
                  disabled={loading}
                >
                  {loading ? '...' : 'Подтвердить'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Admin;