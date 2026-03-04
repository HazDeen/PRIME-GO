import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { toast } from 'sonner';
import { ReactComponent as ArrowLeft } from '../assets/icons/arrow-left.svg';
import { ReactComponent as Edit } from '../assets/icons/edit-2.svg';
import { ReactComponent as Trash2 } from '../assets/icons/trash-2.svg';
import { ReactComponent as User } from '../assets/icons/user.svg';
import { ReactComponent as Apple } from '../assets/icons/apple.svg';
import { ReactComponent as RefreshCw } from '../assets/icons/refresh-cw.svg';

interface User {
  id: number;
  telegramId: string;
  firstName: string;
  lastName: string;
  username: string;
  balance: number;
  isAdmin: boolean;
}

interface Device {
  id: number;
  name: string;
  model: string;
  type: string;
  date: string;
  isActive: boolean;
  daysLeft: number;
  configLink: string;
  inboundId?: number;
  uuid?: string;
}

export default function Admin() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDevices, setUserDevices] = useState<Device[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [editingBalance, setEditingBalance] = useState(false);
  const [newBalance, setNewBalance] = useState('');

  // Константа для baseURL
  const API_BASE_URL = 'https://vpn-production-702c.up.railway.app';

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.admin.getUsers();
      setUsers(response);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Не удалось загрузить пользователей');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDevices = async (userId: number) => {
    try {
      setDevicesLoading(true);
      console.log(`Загрузка устройств для пользователя ${userId}`);
      const allDevices = await api.devices.getAll();
      setUserDevices(allDevices);
    } catch (error) {
      console.error('Failed to fetch devices:', error);
      toast.error('Не удалось загрузить устройства');
    } finally {
      setDevicesLoading(false);
    }
  };

  const handleUserClick = async (user: User) => {
    setSelectedUser(user);
    setEditingBalance(false);
    setNewBalance(user.balance.toString());
    await fetchUserDevices(user.id);
  };

  const handleUpdateBalance = async () => {
    if (!selectedUser) return;
    
    const amount = parseFloat(newBalance);
    if (isNaN(amount) || amount < 0) {
      toast.error('Введите корректную сумму');
      return;
    }

    try {
      await api.balance.topup(amount);
      setSelectedUser({ ...selectedUser, balance: amount });
      setEditingBalance(false);
      toast.success('Баланс обновлён');
      fetchUsers();
    } catch (error) {
      toast.error('Ошибка при обновлении баланса');
    }
  };

  const handleDeleteDevice = async (device: Device) => {
    if (!confirm('Удалить устройство?')) return;
    
    try {
      await api.devices.delete(
        device.id, 
        device.inboundId || 1, 
        device.uuid || ''
      );
      if (selectedUser) {
        await fetchUserDevices(selectedUser.id);
      }
      toast.success('Устройство удалено');
    } catch (error) {
      toast.error('Ошибка при удалении');
    }
  };

  const handleMakeAdmin = async (userId: number, makeAdmin: boolean) => {
    try {
      const token = localStorage.getItem('token');
      // 👇 ИСПРАВЛЕНО: убрали api.defaults, используем прямую константу
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/toggle-admin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isAdmin: makeAdmin })
      });

      if (response.ok) {
        toast.success(`Пользователь ${makeAdmin ? 'назначен' : 'снят'} администратором`);
        fetchUsers();
        if (selectedUser?.id === userId) {
          setSelectedUser({ ...selectedUser, isAdmin: makeAdmin });
        }
      } else {
        throw new Error('Failed to toggle admin status');
      }
    } catch (error) {
      toast.error('Ошибка при изменении прав');
    }
  };

  return (
    <div className="adminPage">
      <div className="adminHeader">
        <button className="backButton" onClick={() => navigate('/')}>
          <ArrowLeft width={24} height={24} />
        </button>
        <h1>Админ-панель</h1>
        <button className="refreshButton" onClick={fetchUsers}>
          <RefreshCw width={20} height={20} />
        </button>
      </div>

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : (
        <div className="adminContent">
          <div className="usersList">
            <h2>Пользователи ({users.length})</h2>
            {users.map(user => (
              <div
                key={user.id}
                className={`userCard ${selectedUser?.id === user.id ? 'selected' : ''}`}
                onClick={() => handleUserClick(user)}
              >
                <div className="userAvatar">
                  <User width={20} height={20} />
                </div>
                <div className="userInfo">
                  <div className="userName">
                    {user.firstName} {user.lastName}
                    {user.isAdmin && <span className="adminBadge">Admin</span>}
                  </div>
                  <div className="userUsername">@{user.username}</div>
                  <div className="userBalance">💰 {user.balance} ₽</div>
                </div>
                <div className="userTelegramId">ID: {user.telegramId}</div>
              </div>
            ))}
          </div>

          {selectedUser && (
            <div className="userDetails">
              <h2>Детали пользователя</h2>
              
              <div className="detailCard">
                <div className="detailRow">
                  <span className="detailLabel">Telegram ID:</span>
                  <span className="detailValue">{selectedUser.telegramId}</span>
                </div>
                <div className="detailRow">
                  <span className="detailLabel">Имя:</span>
                  <span className="detailValue">{selectedUser.firstName} {selectedUser.lastName}</span>
                </div>
                <div className="detailRow">
                  <span className="detailLabel">Username:</span>
                  <span className="detailValue">@{selectedUser.username}</span>
                </div>
                <div className="detailRow">
                  <span className="detailLabel">Баланс:</span>
                  {editingBalance ? (
                    <div className="balanceEdit">
                      <input
                        type="number"
                        value={newBalance}
                        onChange={(e) => setNewBalance(e.target.value)}
                        className="balanceInput"
                      />
                      <button className="saveBtn" onClick={handleUpdateBalance}>💾</button>
                      <button className="cancelBtn" onClick={() => setEditingBalance(false)}>✖</button>
                    </div>
                  ) : (
                    <div className="balanceValue">
                      <span>{selectedUser.balance} ₽</span>
                      <button className="editBtn" onClick={() => setEditingBalance(true)}>
                        <Edit width={16} height={16} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="detailRow">
                  <span className="detailLabel">Админ:</span>
                  <div className="adminToggle">
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={selectedUser.isAdmin}
                        onChange={(e) => handleMakeAdmin(selectedUser.id, e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
              </div>

              <h3>Устройства пользователя</h3>
              {devicesLoading ? (
                <div className="loading">Загрузка устройств...</div>
              ) : userDevices.length === 0 ? (
                <p className="noDevices">Нет устройств</p>
              ) : (
                <div className="devicesList">
                  {userDevices.map(device => (
                    <div key={device.id} className="deviceItem">
                      <div className="deviceIcon">
                        <Apple width={20} height={20} />
                      </div>
                      <div className="deviceInfo">
                        <div className="deviceName">{device.name}</div>
                        <div className="deviceModel">{device.model}</div>
                        <div className="deviceMeta">
                          <span className={`status ${device.isActive ? 'active' : 'inactive'}`}>
                            {device.isActive ? 'Активно' : 'Неактивно'}
                          </span>
                          {device.isActive && <span className="daysLeft">⏳ {device.daysLeft} дн.</span>}
                        </div>
                      </div>
                      <div className="deviceActions">
                        <a href={device.configLink} target="_blank" className="configLinkBtn" title="Ссылка" rel="noreferrer">
                          🔗
                        </a>
                        <button
                          className="deleteDeviceBtn"
                          onClick={() => handleDeleteDevice(device)}
                          title="Удалить"
                        >
                          <Trash2 width={18} height={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}