import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { client } from '../api/client';
import { toast } from 'sonner';
import { 
  Plus, Wallet, ShieldCheck, ShieldAlert, 
  Trash2, Copy, ChevronDown, LogOut, Monitor, 
  Smartphone, Edit2, RefreshCw 
} from 'lucide-react';
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
  userId?: number; // Добавили для связи устройства с пользователем
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

  const fetchData = async () => {
    setLoading(true);
    try {
      // Используем allSettled: если один запрос упадет, второй всё равно загрузит данные
      const [usersRes, devicesRes] = await Promise.allSettled([
        client.admin.getUsers(),
        client.admin.getAllDevices()
      ]);

      if (usersRes.status === 'fulfilled') {
        setUsers(usersRes.value || []);
      } else {
        console.error("Ошибка API (пользователи):", usersRes.reason);
        toast.error("Не удалось загрузить пользователей");
      }

      if (devicesRes.status === 'fulfilled') {
        setDevices(devicesRes.value || []);
      } else {
        console.error("Ошибка API (устройства):", devicesRes.reason);
        toast.error("Не удалось загрузить устройства");
      }
    } catch (e) { 
      console.error("Критическая ошибка:", e);
      toast.error("Сбой соединения с сервером"); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Фильтрация пользователей
  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(searchUser.toLowerCase()) || 
    String(u.telegramId).includes(searchUser)
  );

  // Фильтрация устройств (теперь ищет и по никнейму владельца!)
  const filteredDevices = devices.filter(d => {
    const search = searchDevice.toLowerCase();
    
    // Пытаемся найти владельца по userId или если email это Telegram ID
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

  return (
    <div className="adminContainer">
      <motion.button className="exitBtn" whileTap={{ scale: 0.9 }} onClick={() => navigate('/')}>
        <LogOut size={20} />
      </motion.button>

      <div className="adminHeaderRow">
        <h1 className="mainTitle">Админ-панель</h1>
      </div>

      <div className="adminGrid">
        {/* Пользователи */}
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
                  placeholder="Поиск по @никнейму или ID..." 
                  value={searchUser}
                  onChange={e => setSearchUser(e.target.value)}
                />

                {filteredUsers.map(user => (
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
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Устройства */}
        <div className="adminColumn">
          <div className="columnHeaderRow">
            <div className="headerTitleGroup" onClick={() => setIsDevicesOpen(!isDevicesOpen)}>
              <h2 className="columnLabel">Активные VPN ({filteredDevices.length})</h2>
              <motion.div animate={{ rotate: isDevicesOpen ? 180 : 0 }}>
                <ChevronDown size={20}/>
              </motion.div>
            </div>
            <button className="addBtnCompact" onClick={() => setConfirmModal({ type: 'addDevice', title: 'Новое устройство' })}>
              <Plus size={18} /> <span>Добавить VPN</span>
            </button>
          </div>

          <AnimatePresence>
            {isDevicesOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                <input 
                  type="text" 
                  className="adminSearchInput" 
                  placeholder="Поиск по названию, email или владельцу..." 
                  value={searchDevice}
                  onChange={e => setSearchDevice(e.target.value)}
                />

                {filteredDevices.map(device => {
                  // Находим владельца
                  const linkedUser = users.find(u => u.id === device.userId || String(u.telegramId) === device.email);

                  return (
                    <div key={device.id} className="customCard">
                      <div className="cardMainRow" onClick={() => setExpandedDevice(expandedDevice === device.id ? null : device.id)}>
                        <div className="deviceIcon"><Monitor size={20}/></div>
                        <div className="cardInfo">
                          <div className="primaryText">{device.name}</div>
                          <div className="secondaryText">
                            {device.email} 
                            {linkedUser && (
                              <span style={{ color: 'var(--accent)', marginLeft: '6px', fontWeight: 500 }}>
                                • Владелец: {linkedUser.username || `@id${linkedUser.telegramId}`}
                              </span>
                            )}
                          </div>
                        </div>
                        <motion.div animate={{ rotate: expandedDevice === device.id ? 180 : 0 }}><ChevronDown size={20}/></motion.div>
                      </div>
                      <AnimatePresence>
                        {expandedDevice === device.id && (
                          <motion.div className="cardDropdown" initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}>
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
                    </div>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Центральные модалки подтверждения (изменение, удаление и т.д.) */}
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

      {/* Модалка добавления VPN (если она не имеет своего Overlay, она отрендерится тут) */}
      <AnimatePresence>
        {confirmModal?.type === 'addDevice' && (
          <AdminAddDeviceModal 
            users={users} 
            onClose={() => setConfirmModal(null)} 
            onAdd={async (userId: number, name: string, type: string) => {
              await client.admin.addDeviceForUser(userId, { name, type });
              fetchData(); 
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Admin;