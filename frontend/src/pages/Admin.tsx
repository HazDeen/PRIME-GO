import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { client } from '../api/client';
import { toast } from 'sonner';
import { 
  Plus, Wallet, ShieldCheck, ShieldAlert, 
  Trash2, Copy, ChevronDown, LogOut, Monitor, 
  Smartphone, Edit2, RefreshCw 
} from 'lucide-react';
import { MessageSquare, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../styles/admin.css';
import AdminAddDeviceModal from '../components/AdminAddDeviceModal';

export interface User {
  id: number;
  telegramId: number;
  username: string;
  balance: number;
  isAdmin: boolean;
}

export interface Device {
  id: number;
  name: string;
  email: string;
  configLink: string;
  uuid?: string;
  inboundId?: number;
  userId?: number; 
}

export interface ModalState {
  type: 'balance' | 'name' | 'deleteDevice' | 'admin' | 'addDevice' | 'rename' | 'regenerate' | null;
  title: string;
  data?: any;
  inputValue?: string;
}

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const [expandedDevice, setExpandedDevice] = useState<number | null>(null);

  const [searchUser, setSearchUser] = useState('');
  const [searchDevice, setSearchDevice] = useState('');
  const [isUsersOpen, setIsUsersOpen] = useState(true);
  const [isDevicesOpen, setIsDevicesOpen] = useState(true);

  const [confirmModal, setConfirmModal] = useState<ModalState | null>(null);

  const [restrictions, setRestrictions] = useState({
    all: false,
    users: false,
    admins: false,
    maintenance: false,
  });
  const [isExtraSettingsOpen, setIsExtraSettingsOpen] = useState(false);

  const toggleRestriction = async (target: 'all' | 'users' | 'admins' | 'maintenance') => {
    let newRestrictions = { ...restrictions };
    
    newRestrictions[target] = !newRestrictions[target];
    
    if (target === 'all' && newRestrictions.all) {
      newRestrictions.users = true;
      newRestrictions.admins = true;
    } else if ((target === 'users' || target === 'admins') && !newRestrictions[target]) {
      newRestrictions.all = false;
    }
    
    setRestrictions(newRestrictions);

    try {
      await client.admin.updateSettings(newRestrictions);
      
      // Выбираем ТОЛЬКО ОДНО уведомление для показа
      if (target === 'maintenance') {
        if (newRestrictions.maintenance) {
          toast.warning('Режим тех. работ ВКЛЮЧЕН');
        } else {
          toast.success('Режим тех. работ ВЫКЛЮЧЕН');
        }
      } else {
        // Показываем стандартный тост, только если это были другие тумблеры
        toast.success('Настройки безопасности обновлены');
      }
      
    } catch (error) {
      toast.error('Ошибка сохранения на сервере');
      fetchData(); 
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, devicesRes, settingsRes] = await Promise.allSettled([
        client.admin.getUsers(),
        client.admin.getAllDevices(),
        client.admin.getSettings()
      ]);
      
      if (usersRes.status === 'fulfilled') {
        setUsers(usersRes.value || []);
      } else {
        toast.error("Не удалось загрузить пользователей");
      }

      if (devicesRes.status === 'fulfilled') {
        setDevices(devicesRes.value || []);
      } else {
        toast.error("Не удалось загрузить устройства");
      }

      if (settingsRes.status === 'fulfilled' && settingsRes.value) {
        setRestrictions(settingsRes.value);
      }
    } catch (e) { 
      toast.error("Сбой соединения с сервером"); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(searchUser.toLowerCase()) || 
    String(u.telegramId).includes(searchUser)
  );

  const filteredDevices = devices.filter(d => {
    const search = searchDevice.toLowerCase();
    const linkedUser = users.find(u => u.id === d.userId || String(u.telegramId) === d.email);
    const nameMatch = d.name?.toLowerCase().includes(search);
    const emailMatch = d.email?.toLowerCase().includes(search);
    const userMatch = linkedUser && (
      linkedUser.username?.toLowerCase().includes(search) || 
      String(linkedUser.telegramId).includes(search)
    );
    return nameMatch || emailMatch || userMatch;
  });

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
          await client.admin.deleteDevice(confirmModal.data.id);
          toast.success("Устройство удалено");
          break;
        case 'rename':
          await client.admin.updateUsername(confirmModal.data.id, confirmModal.inputValue || '');
          toast.success("Никнейм изменен");
          break;
        case 'regenerate':
          await client.admin.regenerateLink(confirmModal.data.id);
          toast.success("Ссылка перегенерирована");
          break;
      }
      fetchData(); 
      setConfirmModal(null);
    } catch (e) { 
      toast.error("Ошибка операции"); 
    } finally { 
      setLoading(false); 
    }
  };

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 }
  };

  return (
    <motion.div 
      className="adminContainer"
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      
      {/* ========================================== */}
      {/* 🛡️ ГЛОБАЛЬНЫЕ КНОПКИ УПРАВЛЕНИЯ (СПРАВА СВЕРХУ) */}
      {/* ========================================== */}
      <div className="topRightControls">
        <motion.button 
          className="settingsToggleBtn"
          onClick={() => setIsExtraSettingsOpen(!isExtraSettingsOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ShieldAlert size={20} color={restrictions.all ? "var(--danger)" : "var(--text-secondary)"} />
        </motion.button>

        <motion.button 
          className="exitBtn" 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }} 
          onClick={() => navigate('/home')}
        >
          <LogOut size={20} />
        </motion.button>

        {/* Выпадающее меню блокировок */}
        <AnimatePresence>
          {isExtraSettingsOpen && (
            <motion.div 
              className="globalSettingsDropdown"
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="restrictionItem" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--warning)', fontWeight: 700 }}>Режим "Тех. работы"</span>
                <label className="premiumSwitch">
                  <input 
                    type="checkbox" 
                    checked={restrictions.maintenance} 
                    onChange={() => toggleRestriction('maintenance')} 
                  />
                  <span className="slider round" style={{ borderColor: restrictions.maintenance ? 'var(--warning)' : '' }}></span>
                </label>
              </div>
              <div className="restrictionItem">
                <span>Запретить всем (Global)</span>
                <label className="premiumSwitch">
                  <input 
                    type="checkbox" 
                    checked={restrictions.all} 
                    onChange={() => toggleRestriction('all')} 
                  />
                  <span className="slider round"></span>
                </label>
              </div>
              <div className="restrictionItem">
                <span>Запретить пользователям</span>
                <label className="premiumSwitch">
                  <input 
                    type="checkbox" 
                    checked={restrictions.users} 
                    onChange={() => toggleRestriction('users')} 
                  />
                  <span className="slider round"></span>
                </label>
              </div>
              <div className="restrictionItem">
                <span>Запретить админам</span>
                <label className="premiumSwitch">
                  <input 
                    type="checkbox" 
                    checked={restrictions.admins} 
                    onChange={() => toggleRestriction('admins')} 
                  />
                  <span className="slider round"></span>
                </label>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* ========================================== */}

      <div className="adminHeaderRow">
        <h1 className="mainTitle">Админ-панель</h1>
      </div>

      <div className="adminGrid">
        {/* === КОЛОНКА ПОЛЬЗОВАТЕЛИ === */}
        <div className="adminColumn">
          <div className="columnHeaderRow">
            <div className="headerTitleGroup" onClick={() => setIsUsersOpen(!isUsersOpen)}>
              <h2 className="columnLabel">Пользователи ({filteredUsers.length})</h2>
              <motion.div animate={{ rotate: isUsersOpen ? 180 : 0 }}>
                <ChevronDown size={20}/>
              </motion.div>
            </div>
          </div>

          <AnimatePresence>
            {isUsersOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                <input 
                  type="text" 
                  className="adminSearchInput" 
                  placeholder="Поиск по никнейму или ID..." 
                  value={searchUser}
                  onChange={e => setSearchUser(e.target.value)}
                />

                {filteredUsers.map((user, idx) => (
                  <motion.div 
                    key={user.id} 
                    className="customCard"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
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
                        <motion.div className="cardDropdown" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                          <button className="dropItem" onClick={() => setConfirmModal({ type: 'rename', title: 'Изменить никнейм', data: user, inputValue: user.username })}>
                            <Edit2 size={14}/> Изменить никнейм
                          </button>
                          <button className="dropItem" onClick={() => setConfirmModal({ type: 'balance', title: 'Изменить баланс', data: user, inputValue: '0' })}>
                            <Wallet size={14}/> Изменить баланс
                          </button>
                          <button className="dropItem" onClick={() => setConfirmModal({ type: 'admin', title: 'Сменить права', data: user })}>
                            <ShieldAlert size={14}/> {user.isAdmin ? 'Снять админа' : 'Сделать админом'}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* === КОЛОНКА УСТРОЙСТВА === */}
        <div className="adminColumn">
          <div className="columnHeaderRow">
            <div className="headerTitleGroup" onClick={() => setIsDevicesOpen(!isDevicesOpen)}>
              <h2 className="columnLabel">Активные VPN ({filteredDevices.length})</h2>
              <motion.div animate={{ rotate: isDevicesOpen ? 180 : 0 }}>
                <ChevronDown size={20}/>
              </motion.div>
            </div>
            
            {/* Кнопка "Добавить VPN" осталась на своем месте */}
            <div className="adminActionGroup">
              <motion.button 
                className="addBtnCompact" 
                onClick={() => setConfirmModal({ type: 'addDevice', title: 'Новое устройство' })}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Plus size={18} /> <span>Добавить VPN</span>
              </motion.button>
            </div>
          </div>

          {/* Список устройств */}
          <AnimatePresence>
            {isDevicesOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                <input 
                  type="text" 
                  className="adminSearchInput" 
                  placeholder="Поиск по названию или владельцу..." 
                  value={searchDevice}
                  onChange={e => setSearchDevice(e.target.value)}
                />

                {filteredDevices.map((device, idx) => {
                  const linkedUser = users.find(u => u.id === device.userId || String(u.telegramId) === device.email);

                  return (
                    <motion.div 
                      key={device.id} 
                      className="customCard"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <div className="cardMainRow" onClick={() => setExpandedDevice(expandedDevice === device.id ? null : device.id)}>
                        <div className="deviceIcon"><Monitor size={20}/></div>
                        <div className="cardInfo">
                          <div className="primaryText">{device.name}</div>
                          <div className="secondaryText">
                            {device.email} 
                            {linkedUser && (
                              <span style={{ color: 'var(--text-primary)', marginLeft: '6px', fontWeight: 600 }}>
                                • {linkedUser.username || `@id${linkedUser.telegramId}`}
                              </span>
                            )}
                          </div>
                        </div>
                        <motion.div animate={{ rotate: expandedDevice === device.id ? 180 : 0 }}><ChevronDown size={20}/></motion.div>
                      </div>
                      <AnimatePresence>
                        {expandedDevice === device.id && (
                          <motion.div className="cardDropdown" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                            <button className="dropItem" onClick={() => setConfirmModal({ type: 'regenerate', title: 'Сменить ключ?', data: device })}>
                              <RefreshCw size={14}/> Перегенерировать ссылку
                            </button>
                            <button className="dropItem" onClick={() => { 
                                navigator.clipboard.writeText(device.configLink || ''); 
                                toast.success("Скопировано"); 
                            }}>
                              <Copy size={14}/> Копировать ссылку
                            </button>
                            <button className="dropItem delete" onClick={() => setConfirmModal({ type: 'deleteDevice', title: 'Удалить устройство?', data: device })}>
                              <Trash2 size={14}/> Удалить VPN
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Раздел Поддержки */}
      <motion.div 
        className="deviceCard"
        onClick={() => navigate('/admin/tickets')}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        style={{ marginTop: '16px', border: '1px solid var(--border-accent)' }}
      >
        <div className="deviceIcon" style={{ background: 'var(--warning-alpha)', color: 'var(--warning)' }}>
          <MessageSquare size={24} />
        </div>
        <div className="deviceInfo">
          <div className="deviceNameWrapper">
            <span className="deviceName" style={{ fontSize: '18px' }}>Поддержка (Тикеты)</span>
          </div>
          <div className="deviceDate" style={{ color: 'var(--text-secondary)' }}>
            Ответы на вопросы пользователей
          </div>
        </div>
        <ChevronRight className="deviceChevron" size={20} />
      </motion.div>

      {/* Центральные модалки подтверждения */}
      <AnimatePresence>
        {confirmModal && confirmModal.type !== 'addDevice' && (
          <div className="modalOverlay center" onClick={() => setConfirmModal(null)}>
            <motion.div 
              className="confirmModal" 
              initial={{ scale: 0.95, opacity: 0, y: 10 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={e => e.stopPropagation()}
            >
              <h2 className="modalTitle">{confirmModal.title}</h2>
              <p className="modalSub">Выполнить действие для {confirmModal.data?.username || confirmModal.data?.name || 'выбранного объекта'}?</p>
              
              {(confirmModal.type === 'balance' || confirmModal.type === 'name' || confirmModal.type === 'rename') && (
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
                  {loading ? 'Загрузка...' : 'Подтвердить'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Модалка добавления VPN */}
      <AnimatePresence>
        {confirmModal?.type === 'addDevice' && (
          <AdminAddDeviceModal 
            users={users} 
            isBlocked={restrictions.all || restrictions.admins}
            onClose={() => setConfirmModal(null)} 
            onAdd={async (userId: number, name: string, type: string) => {
              await client.admin.addDeviceForUser(userId, { name, type });
              fetchData(); 
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Admin;