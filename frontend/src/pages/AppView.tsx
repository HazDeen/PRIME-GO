import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Sparkles, Wallet, User, ChevronRight, 
  Settings, ShieldCheck, LifeBuoy, LogOut,
  ChevronLeft, Plus, Bell, Moon, Sun, 
  MessageSquare, Bitcoin, Globe, Bug, Lightbulb, MessageCircle, 
  Headset, CreditCard, ChevronDown, ArrowDownToLine, RefreshCcw, 
  Edit2, Trash2, Smartphone, Check, AlertTriangle, 
  Copy, RefreshCw, X, Timer, Send, Info, Clock, CheckCircle2, BellRing
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBalance } from '../hooks/useBalance';
import { useDevices } from '../hooks/useDevices';
import { useTransactions } from '../hooks/useTransactions';
import { client } from '../api/client';
import { toast } from 'sonner';

// Компоненты
import BalanceCard from "../components/BalanceCard";
import DevicesCard from "../components/DevicesCard";
import AddDeviceModal from "../components/AddDeviceModal";

import '../styles/appview.css';

// --- ТИПЫ ---
type Tab = 'services' | 'wallet' | 'profile';
type Service = null | 'vpn' | 'gemini';
type ProfileScreen = null | 'settings' | 'support';

// Тип для глубоких экранов, которые открываются поверх всего
type DeepScreen = null | { type: 'history' } | { type: 'device'; id: number } | { type: 'ticket'; id: number };

const API_URL = 'https://h4zdeen.up.railway.app';
const PRESET_AMOUNTS = [100, 300, 500];
const TOPICS = [
  { id: 'payment', label: 'Вопрос по оплате', icon: <CreditCard size={18} /> },
  { id: 'vpn', label: 'Не работает VPN', icon: <Globe size={18} /> },
  { id: 'bug', label: 'Ошибка в приложении', icon: <Bug size={18} /> },
  { id: 'idea', label: 'Предложение / Идея', icon: <Lightbulb size={18} /> },
  { id: 'other', label: 'Другое', icon: <MessageCircle size={18} /> },
];

// Анимации перехода
const slideVariants = { initial: { opacity: 0, x: 20 }, in: { opacity: 1, x: 0 }, out: { opacity: 0, x: -20 } };
const fadeVariants = { initial: { opacity: 0, y: 10 }, in: { opacity: 1, y: 0 }, out: { opacity: 0, y: -10 } };

// ==========================================
// ВНУТРЕННИЕ ЭКРАНЫ (Deep Screens)
// ==========================================

// 1. ЭКРАН ИСТОРИИ
const HistoryScreen = ({ onClose, onGoToTopup }: { onClose: () => void, onGoToTopup: () => void }) => {
  const { transactions, loading: transactionsLoading } = useTransactions();
  const { balance, loading: balanceLoading } = useBalance();

  if (transactionsLoading || balanceLoading) {
    return (
      <motion.div className="historyPage" variants={slideVariants} initial="initial" animate="in" exit="out">
        <div className="historyHeader">
          <button className="backButton" onClick={onClose}><ChevronLeft size={24} /></button>
          <h1 style={{ margin: 0 }}>История</h1>
          <div style={{ width: 44 }} />
        </div>
        <div className="loadingMessage" style={{ textAlign: 'center', marginTop: '40px' }}>⏳ Загрузка...</div>
      </motion.div>
    );
  }

  return (
    <motion.div className="historyPage" variants={slideVariants} initial="initial" animate="in" exit="out">
      <div className="historyHeader">
        <button className="backButton" onClick={onClose}><ChevronLeft size={24} /></button>
        <h1 style={{ margin: 0 }}>История</h1>
        <button className="topupSmallButton" onClick={onGoToTopup}>
          <Plus size={18} /> <span>{balance} ₽</span>
        </button>
      </div>

      <div className="transactionsList">
        {Object.entries(transactions).map(([date, items]: [string, any[]], groupIdx) => (
          <motion.div key={date} className="transactionGroup" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: groupIdx * 0.1 }}>
            <div className="transactionDate">{date}</div>
            {items.map((item, itemIdx) => {
              const isTopup = item.description.includes('Пополнение');
              const Icon = isTopup ? ArrowDownToLine : RefreshCcw;
              return (
                <div key={itemIdx} className="transactionRow">
                  <div className="transactionIcon" style={{ background: isTopup ? 'var(--success-alpha)' : 'var(--danger-alpha)', color: isTopup ? 'var(--success)' : 'var(--danger)' }}>
                    <Icon size={20} />
                  </div>
                  <div className="transactionInfo">
                    <span className="transactionDesc">{item.description}</span>
                    <span className="transactionTime">{item.time}</span>
                  </div>
                  {item.amount !== 0 && (
                    <span className={`transactionAmount ${item.amount > 0 ? 'positive' : 'negative'}`}>
                      {item.amount > 0 ? '+' : ''}{item.amount} ₽
                    </span>
                  )}
                </div>
              );
            })}
          </motion.div>
        ))}
        {Object.keys(transactions).length === 0 && (
          <div style={{ textAlign: 'center', marginTop: '60px', color: 'var(--text-tertiary)' }}>История пуста</div>
        )}
      </div>
    </motion.div>
  );
};

// 2. ЭКРАН НАСТРОЕК УСТРОЙСТВА
const DeviceDetailScreen = ({ deviceId, onClose }: { deviceId: number, onClose: () => void }) => {
  const [device, setDevice] = useState<any>(null);
  const [deviceName, setDeviceName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { loadDevice(); }, [deviceId]);

  const loadDevice = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await fetch(`${API_URL}/devices/user/${user.telegramId}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      const devices = await response.json();
      const current = devices.find((d: any) => d.id === deviceId);
      if (current) {
        setDevice(current);
        setDeviceName(current.name || current.customName);
      } else {
        toast.error('Устройство не найдено');
        onClose();
      }
    } catch (e) { toast.error('Ошибка загрузки'); } finally { setLoading(false); }
  };

  const handleCopy = () => {
    if (device?.configLink) {
      navigator.clipboard.writeText(device.configLink);
      setCopied(true);
      toast.success('Скопировано!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReplaceLink = async () => {
    toast.loading('Новая ссылка...', { id: 'replace' });
    try {
      const response = await fetch(`${API_URL}/devices/${deviceId}/replace`, { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      const data = await response.json();
      if (response.ok) { setDevice({ ...device, configLink: data.configLink }); toast.success('Обновлено!', { id: 'replace' }); }
    } catch (e) { toast.error('Ошибка', { id: 'replace' }); }
  };

  const handleSaveName = async () => {
    if (!deviceName.trim()) return;
    try {
      const response = await fetch(`${API_URL}/devices/${deviceId}/name`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ customName: deviceName })
      });
      if (response.ok) { setDevice({ ...device, name: deviceName }); setIsEditing(false); toast.success('Сохранено'); }
    } catch (e) { toast.error('Ошибка'); }
  };

  const performDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    toast.loading('Удаляем...', { id: 'del' });
    try {
      const response = await fetch(`${API_URL}/devices/${deviceId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      if (response.ok) { toast.success('Удалено!', { id: 'del' }); onClose(); }
    } catch (e) { toast.error('Ошибка', { id: 'del' }); } finally { setIsDeleting(false); }
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '40px' }}>Загрузка...</div>;
  if (!device) return null;

  const handleRenew = async () => {
    toast.loading('Продление подписки...', { id: 'renew' });
    try {
      const response = await fetch(`${API_URL}/devices/${deviceId}/renew`, { 
        method: 'POST', 
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } 
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Ошибка');
      }
      toast.success('Подписка успешно продлена!', { id: 'renew' });
      loadDevice(); // Перезагружаем данные
    } catch (e: any) { 
      toast.error(e.message || 'Ошибка продления. Проверьте баланс.', { id: 'renew' }); 
    }
  };

  return (
    <motion.div variants={slideVariants} initial="initial" animate="in" exit="out" style={{ paddingBottom: '40px' }}>
      <div className="deviceDetailHeader">
        <button className="backButton" onClick={onClose}><ChevronLeft size={24} /></button>
        <h1 style={{ margin: 0 }}>Настройки устройства</h1>
      </div>

      <div className="deviceProfileCard">
        <div className="deviceProfileIcon"><Smartphone size={36} /></div>
        <div className="deviceProfileInfo">
          {isEditing ? (
            <div className="deviceNameEdit">
              <input type="text" value={deviceName} onChange={(e) => setDeviceName(e.target.value)} autoFocus onBlur={handleSaveName} onKeyDown={(e) => e.key === 'Enter' && handleSaveName()} />
              <button onClick={handleSaveName} className="saveNameBtn"><Check size={16} /></button>
            </div>
          ) : (
            <div className="deviceNameDisplay">
              <h2>{device.name}</h2>
              <button onClick={() => setIsEditing(true)} className="editNameBtn"><Edit2 size={14} /></button>
            </div>
          )}
          <div className="deviceProfileInfo">
            <p className="deviceProfileModel">
              {device.model || 'VPN Устройство'} • {device.location === 'at' ? '🇦🇹 Австрия' : '🇨🇭 Швейцария'}
            </p>
            
            <div className="deviceProfileStatus" style={{ marginTop: '12px' }}>
              {device.daysLeft > 0 ? (
                <>
                  <span className={`statusBadge ${device.isActive ? 'active' : 'inactive'}`}>
                    {device.isActive ? '● Активно' : '○ Неактивно'}
                  </span>
                  <span className="daysBadge"><Timer size={14} /> {device.daysLeft} дн.</span>
                </>
              ) : (
                <motion.button 
                  onClick={handleRenew}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{ 
                    background: 'var(--accent)', color: '#fff', border: 'none', 
                    padding: '8px 16px', borderRadius: '16px', fontWeight: 600, 
                    display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px',
                    boxShadow: '0 4px 12px rgba(10, 132, 255, 0.3)'
                  }}
                >
                  <RefreshCw size={16} /> Продлить подписку
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="configCard">
        <h3 className="configCardTitle">Конфигурация</h3>
        <p className="configCardDescription">Скопируйте ссылку и вставьте в приложение HitProxy или Vibe</p>
        <div className="configLinkContainer">
          <code className="configLinkCode">{device.configLink}</code>
          <div className="configActions">
            <button className={`copyLinkBtn ${copied ? 'copied' : ''}`} onClick={handleCopy}><Copy size={18} /> {copied ? 'Скопировано!' : 'Копировать'}</button>
            <button className="replaceLinkBtn" onClick={handleReplaceLink}><RefreshCw size={18} /></button>
          </div>
        </div>
      </div>

      <div className={`deleteCard ${confirmDelete ? 'confirm' : ''}`} onClick={!isDeleting ? () => { !confirmDelete ? setConfirmDelete(true) : performDelete() } : undefined}>
        <div className="deleteCardIcon">{isDeleting ? <div className="spinner-small" /> : confirmDelete ? <AlertTriangle size={24} /> : <Trash2 size={24} />}</div>
        <div className="deleteCardContent">
          <h4>{isDeleting ? 'Удаление...' : confirmDelete ? 'Подтвердите удаление' : 'Удалить устройство'}</h4>
          <p>{confirmDelete ? 'Нажмите ещё раз' : 'Это нельзя отменить'}</p>
        </div>
        {confirmDelete && !isDeleting && (
          <button className="cancelDeleteBtn" onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}><X size={16} /></button>
        )}
      </div>
    </motion.div>
  );
};

// 3. ЭКРАН ЧАТА ПОДДЕРЖКИ
const TicketChatScreen = ({ ticketId, onClose }: { ticketId: number, onClose: () => void }) => {
  const [ticket, setTicket] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTicket(true);
    const interval = setInterval(() => loadTicket(false), 3000);
    return () => clearInterval(interval);
  }, [ticketId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [ticket?.messages?.length]);

  const loadTicket = async (showLoading = false) => {
    try {
      const response = await fetch(`${API_URL}/tickets/${ticketId}`);
      setTicket(await response.json());
    } catch (e) { if (showLoading) { toast.error('Ошибка загрузки'); onClose(); } } 
    finally { if (showLoading) setLoading(false); }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || ticket?.status === 'CLOSED') return;
    setSending(true);
    const tempMsg = { id: Date.now(), text: newMessage, isAdmin: false, createdAt: new Date().toISOString() };
    setTicket({ ...ticket, messages: [...ticket.messages, tempMsg] });
    setNewMessage('');
    try {
      await fetch(`${API_URL}/tickets/${ticketId}/message`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: tempMsg.text, isAdmin: false }) });
      loadTicket(false);
    } catch (e) { toast.error('Ошибка'); loadTicket(false); } finally { setSending(false); }
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '40px' }}>Загрузка чата...</div>;
  if (!ticket) return null;
  const isClosed = ticket.status === 'CLOSED';

  return (
    <motion.div className="chatContainer" variants={slideVariants} initial="initial" animate="in" exit="out" style={{ padding: 0, height: '100%' }}>
      <div className="chatHeader" style={{ borderBottom: 'none' }}>
        <div className="chatHeaderLeft">
          <button className="backButton" onClick={onClose}><ChevronLeft size={24} /></button>
          <div className="chatTitleInfo">
            <h1 className="chatTitle">{ticket.topic}</h1>
            <span className={`chatStatus ${isClosed ? 'closed' : 'open'}`}>{isClosed ? 'Закрыт' : 'Агент на связи'}</span>
          </div>
        </div>
      </div>

      <div className="chatMessagesArea" style={{ padding: '0 10px' }}>
        <div className="chatSystemMessage"><div className="chatSystemMessageInner"><Info size={12} /> Чат создан {new Date(ticket.createdAt).toLocaleDateString()}</div></div>
        {ticket.messages.map((msg: any) => {
          const isUser = !msg.isAdmin;
          return (
            <div key={msg.id} className={`chatMessageWrapper ${isUser ? 'reverse' : ''}`}>
              <div className={`chatBubble ${isUser ? 'userStyle' : 'adminStyle'}`}>
                {msg.text}
                <div className={`chatTime ${isUser ? 'right' : 'left'}`}>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="chatInputArea" style={{ padding: '16px 0 20px 0' }}>
        {isClosed ? (
          <div className="chatClosedMessage">Вопрос решен. Чат закрыт.</div>
        ) : (
          <form onSubmit={handleSendMessage} className="chatInputForm">
            <input className="modalInput chatInputField" style={{ margin: 0 }} type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Сообщение..." />
            <button type="submit" className={`chatSendBtn ${newMessage.trim() ? 'active' : 'disabled'}`} disabled={!newMessage.trim() || sending}><Send size={20} /></button>
          </form>
        )}
      </div>
    </motion.div>
  );
};


// ==========================================
// ГЛАВНЫЙ КОМПОНЕНТ APP VIEW
// ==========================================
export default function AppView() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  // Базовая навигация
  const [activeTab, setActiveTab] = useState<Tab>('services');
  const [activeService, setActiveService] = useState<Service>(null);
  const [activeProfileScreen, setActiveProfileScreen] = useState<ProfileScreen>(null);
  
  // Глубокие экраны (История, Настройки Девайса, Чат)
  const [deepScreen, setDeepScreen] = useState<DeepScreen>(null);

  // --- Состояния Уведомлений и Настроек ---
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Локальные стейты для тумблеров
  const [autoRenewVpn, setAutoRenewVpn] = useState(user?.autoRenewVpn || false);
  const [autoRenewGemini, setAutoRenewGemini] = useState(user?.autoRenewGemini || false);
  const [tgNotifications, setTgNotifications] = useState(user?.tgNotifications !== false);

  // Загрузка уведомлений
  useEffect(() => {
    if (user?.telegramId) {
      fetch(`${API_URL}/users/${user.telegramId}/notifications`)
        .then(res => res.json())
        .then(data => setNotifications(data))
        .catch(() => {});
    }
  }, [user]);

  // Функция обновления настроек
  const updateSetting = async (key: string, value: boolean) => {
    try {
      // Оптимистичное обновление UI
      if (key === 'autoRenewVpn') setAutoRenewVpn(value);
      if (key === 'autoRenewGemini') setAutoRenewGemini(value);
      if (key === 'tgNotifications') setTgNotifications(value);

      await fetch(`${API_URL}/users/${user?.telegramId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value })
      });
      
      // Обновляем юзера в localStorage
      const updatedUser = { ...user, [key]: value };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (e) {
      toast.error('Ошибка сохранения настроек');
    }
  };

  // Прочитать все уведомления
  const markAsRead = async () => {
    if (unreadCount === 0) return;
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    await fetch(`${API_URL}/users/${user?.telegramId}/notifications/read`, { method: 'POST' });
  };
  
  // Тема
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') !== 'light');
  useEffect(() => {
    if (isDarkMode) { document.body.removeAttribute('data-theme'); localStorage.setItem('theme', 'dark'); } 
    else { document.body.setAttribute('data-theme', 'light'); localStorage.setItem('theme', 'light'); }
  }, [isDarkMode]);

  // Данные
  const [showVpnAddModal, setShowVpnAddModal] = useState(false);
  const { addDevice } = useDevices();
  const { balance, refetch: refetchBalance } = useBalance();
  const [selectedTopup, setSelectedTopup] = useState<number | 'custom'>(100);
  const [customAmount, setCustomAmount] = useState('');
  const [loadingTopup, setLoadingTopup] = useState(false);
  const currentAmount = selectedTopup === 'custom' ? Number(customAmount) : selectedTopup;
  const newBalance = (balance || 0) + (currentAmount || 0);

  const [loadingGemini, setLoadingGemini] = useState(false);

  // Тикеты
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketTopic, setTicketTopic] = useState(TOPICS[0].label);
  const [ticketText, setTicketText] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // --- Хэндлеры ---
  const handleAddDevice = async (name: string, customName: string, type: any, location: string) => {
    try {
      await addDevice(name, customName, type, location); 
      refetchBalance(); 
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) { throw e; }
  };

  const handlePay = async () => {
    if (!currentAmount || currentAmount < 50) return toast.error('Минимум 50 ₽');
    setLoadingTopup(true);
    try {
      const response = await client.payments.create(currentAmount);
      window.location.href = response.url;
    } catch (e: any) { toast.error('Ошибка'); setLoadingTopup(false); }
  };

  const handleRequestGemini = async () => {
    setLoadingGemini(true);
    try {
      const response = await fetch(`${API_URL}/tickets`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.telegramId?.toString(), topic: 'Доступ к Gemini AI', text: 'Хочу получить доступ к Gemini AI.' }),
      });
      if (!response.ok) throw new Error();
      const newTicket = await response.json();
      toast.success('Заявка создана');
      setTimeout(() => {
        setActiveService(null);
        setActiveTab('profile');
        setActiveProfileScreen('support');
        setDeepScreen({ type: 'ticket', id: newTicket.id });
      }, 1000);
    } catch (e) { toast.error('Ошибка'); setLoadingGemini(false); }
  };

  const loadTickets = async () => {
    try {
      if (!user) return;
      const response = await fetch(`${API_URL}/tickets/user/${user.telegramId}`);
      setTickets(await response.json());
    } catch (e) { toast.error('Ошибка'); } finally { setLoadingTickets(false); }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketText.trim()) return toast.error('Опишите проблему');
    setIsSubmittingTicket(true);
    try {
      await fetch(`${API_URL}/tickets`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.telegramId, topic: ticketTopic, text: ticketText }),
      });
      toast.success('Обращение создано');
      setShowTicketModal(false); setTicketText(''); loadTickets();
    } catch (e) { toast.error('Ошибка'); } finally { setIsSubmittingTicket(false); }
  };

  // Вспомогательная функция для бейджиков
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN': 
        return (
          <div className="daysBadge" style={{ background: 'var(--warning-alpha)', color: 'var(--warning)' }}>
            <Clock size={14} /> Открыт
          </div>
        );
      case 'ANSWERED': 
        return (
          <div className="daysBadge" style={{ background: 'var(--accent-alpha)', color: 'var(--accent)' }}>
            <MessageCircle size={14} /> Ждет ответа
          </div>
        );
      case 'CLOSED': 
        return (
          <div className="daysBadge" style={{ background: 'var(--success-alpha)', color: 'var(--success)' }}>
            <CheckCircle2 size={14} /> Решен
          </div>
        );
      default: return null;
    }
  };

  // Общий Header для вкладок (с колокольчиком)
  const ScreenHeader = ({ title }: { title: string }) => (
    <div className="topBar">
      <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{title}</h1>
      <div className="bellBtn" onClick={() => {
        setShowNotifications(!showNotifications);
        if (!showNotifications) markAsRead();
      }}>
        {unreadCount > 0 ? <BellRing size={20} /> : <Bell size={20} />}
        {unreadCount > 0 && <span className="unreadBadge">{unreadCount}</span>}
      </div>

      {/* Выпадающий список уведомлений */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div 
            className="notificationsDropdown"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
          >
            <h3 style={{ margin: '8px 8px 16px', fontSize: '16px', color: 'var(--text-primary)' }}>Уведомления</h3>
            {notifications.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px 0' }}>Нет новых уведомлений</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`notifItem ${n.isRead ? 'read' : 'unread'}`}>
                  <div className="notifTitle">
                    {n.title.includes('оплат') ? <Bitcoin size={16} color="var(--accent)" /> : <Info size={16} color="var(--text-primary)" />}
                    {n.title}
                  </div>
                  <div className="notifMessage">{n.message}</div>
                  <div className="notifTime">{new Date(n.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  
  // ==========================================
  // РЕНДЕР ВЬЮШЕК
  // ==========================================
  const renderServicesTab = () => {
    if (!activeService) {
      return (
        <motion.div key="grid" variants={fadeVariants} initial="initial" animate="in" exit="out">
          <ScreenHeader title="Сервисы" />
          <div className="services-grid">
            <div className="service-card" onClick={() => setActiveService('vpn')}>
              <div className="service-icon-wrapper"><Shield size={28} /></div>
              <span className="service-title">Prime VPN</span>
            </div>
            <div className="service-card" onClick={() => setActiveService('gemini')}>
              <div className="service-icon-wrapper"><Sparkles size={28} /></div>
              <span className="service-title">Gemini AI</span>
            </div>
          </div>
        </motion.div>
      );
    }

    if (activeService === 'vpn') {
      return (
        <motion.div key="vpn" variants={slideVariants} initial="initial" animate="in" exit="out">
          <div className="deviceDetailHeader">
            <button className="backButton" onClick={() => setActiveService(null)}><ChevronLeft size={24} /></button>
            <h1 style={{ margin: 0 }}>Prime VPN</h1>
          </div>
          <BalanceCard />
          <div className="actionsRow">
            <button className="actionBtnSmall" onClick={() => setActiveTab('wallet')}><Wallet size={20} /> Пополнить</button>
            <button className="actionBtnSmall" onClick={() => setDeepScreen({ type: 'history' })}><RefreshCcw size={20} /> История</button>
          </div>
          <DevicesCard onAddClick={() => setShowVpnAddModal(true)} onDeviceClick={(id) => setDeepScreen({ type: 'device', id })} />
        </motion.div>
      );
    }

    if (activeService === 'gemini') {
      return (
        <motion.div key="gemini" variants={slideVariants} initial="initial" animate="in" exit="out">
          <div className="deviceDetailHeader">
            <button className="backButton" onClick={() => setActiveService(null)}><ChevronLeft size={24} /></button>
            <h1 style={{ margin: 0 }}>Gemini AI</h1>
          </div>
          <BalanceCard />
          <div className="actionsRow">
            <button className="actionBtnSmall" onClick={() => setActiveTab('wallet')}><Wallet size={20} /> Пополнить</button>
            <button className="actionBtnSmall" onClick={() => setDeepScreen({ type: 'history' })}><RefreshCcw size={20} /> История</button>
          </div>
          <div className="configCard">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div className="deviceIcon"><Sparkles size={24} /></div>
              <div><h2 className="configCardTitle" style={{ margin: 0 }}>Умный помощник</h2><p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>Нейросеть нового поколения</p></div>
            </div>
            <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
              <li>Генерация текстов и кода любой сложности</li>
              <li>Помощь в решении повседневных задач</li>
            </ul>
            <button className="payButton" onClick={handleRequestGemini} disabled={loadingGemini}>
              {loadingGemini ? 'Создание заявки...' : <><MessageSquare size={20} /> Получить доступ</>}
            </button>
          </div>
        </motion.div>
      );
    }
  };

  const renderWalletTab = () => (
    <motion.div key="wallet" variants={fadeVariants} initial="initial" animate="in" exit="out">
      <ScreenHeader title="Кошелек" />
      <div className="balancePreview"><span className="previewLabel">Баланс после пополнения</span><span className="previewAmount">{newBalance} ₽</span></div>
      <div className="amountSelector">
        <p className="selectorTitle">Выберите сумму</p>
        <div className="amountGrid">
          {PRESET_AMOUNTS.map((amt) => (<button key={amt} className={`amountChip ${selectedTopup === amt ? 'active' : ''}`} onClick={() => setSelectedTopup(amt)}>{amt} ₽</button>))}
        </div>
        <button className={`customChip ${selectedTopup === 'custom' ? 'active' : ''}`} onClick={() => setSelectedTopup('custom')}>Другое</button>
        <AnimatePresence>
          {selectedTopup === 'custom' && (<motion.input initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} type="number" className="customAmountInput" placeholder="Сумма (от 50 ₽)..." value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} />)}
        </AnimatePresence>
      </div>
      <div className="infoMessage" style={{ marginBottom: 24 }}><Wallet size={20} className="infoIcon" /><p>Средства зачисляются моментально.</p></div>
      <button className="payButton" onClick={handlePay} disabled={loadingTopup || (selectedTopup === 'custom' && currentAmount < 50)}>
        <Bitcoin size={20} /> {loadingTopup ? 'Создание счета...' : `Пополнить на ${currentAmount || 0} ₽`}
      </button>
    </motion.div>
  );

  const renderProfileTab = () => {
    if (activeProfileScreen === 'support') {
      if (loadingTickets && tickets.length === 0) loadTickets();
      const currentTopicObj = TOPICS.find(t => t.label === ticketTopic) || TOPICS[0];
      return (
        <motion.div key="support" variants={slideVariants} initial="initial" animate="in" exit="out">
          <div className="deviceDetailHeader"><button className="backButton" onClick={() => setActiveProfileScreen(null)}><ChevronLeft size={24} /></button><h1 style={{ margin: 0 }}>Поддержка</h1></div>
          <div className="infoMessage"><Headset className="infoIcon" size={20} /><div>Служба поддержки работает с 10:00 до 22:00. Отвечаем в течение 15 минут.</div></div>
          <div className="devicesCardHeader" style={{ marginTop: '32px' }}><div className="devicesCardTitle"><h2 className="sectionTitle">Мои обращения</h2>{!loadingTickets && <span className="devicesCount">{tickets.length}</span>}</div><button className="addButton" onClick={() => setShowTicketModal(true)}><Plus size={18} /> Новое</button></div>
          <div className="ticketsList">
            {loadingTickets ? <div style={{textAlign:'center', marginTop: 20}}>Загрузка...</div> : tickets.length === 0 ? <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>Нет обращений</div> : (
              tickets.map((ticket, i) => (
                <motion.div key={ticket.id} className="deviceCard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} onClick={() => setDeepScreen({ type: 'ticket', id: ticket.id })}>
                  <div className="deviceIcon" style={{ background: 'var(--bg-input)' }}><MessageCircle size={24} /></div>
                  <div className="deviceInfo">
                    <div className="deviceNameWrapper">
                      <span className="deviceName" style={{ fontSize: '16px' }}>{ticket.topic}</span>
                    </div>
                    <div className="deviceDate">
                      Тикет #{ticket.id} • {new Date(ticket.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  {getStatusBadge(ticket.status)}
                  <ChevronRight className="deviceChevron" size={20} />
                </motion.div>
              ))
            )}
          </div>
          <AnimatePresence>
            {showTicketModal && (
              <div className="modalOverlay">
                <motion.div className="modalBackdrop" onClick={() => setShowTicketModal(false)} />
                <motion.div className="modalSheet" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}>
                  <div className="modalHandle" onClick={() => setShowTicketModal(false)} />
                  <h2 className="modalTitle">Новое обращение</h2>
                  <form onSubmit={handleCreateTicket}>
                    <div className="modalField" style={{ zIndex: 50, position: 'relative' }}>
                      <label className="modalLabel">Тема обращения</label>
                      <div className="customDropdownContainer">
                        <div className="modalInput customDropdownHeader" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                          <div className="customDropdownHeaderContent"><span className="customDropdownIcon">{currentTopicObj.icon}</span><span>{currentTopicObj.label}</span></div>
                          <ChevronDown size={20} style={{ color: 'var(--text-secondary)' }} />
                        </div>
                        <AnimatePresence>
                          {isDropdownOpen && (
                            <motion.div className="customDropdownList" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                              {TOPICS.map((t) => (<div key={t.id} onClick={() => { setTicketTopic(t.label); setIsDropdownOpen(false); }} className={`customDropdownItem ${ticketTopic === t.label ? 'active' : ''}`}><span className="customDropdownIcon">{t.icon}</span> {t.label}</div>))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    <div className="modalField" style={{ position: 'relative', zIndex: 1 }}><label className="modalLabel">Описание проблемы</label><textarea className="modalInput" value={ticketText} onChange={e => setTicketText(e.target.value)} placeholder="Опишите ситуацию..." rows={4} style={{ resize: 'none' }} /></div>
                    <div className="modalActionsRow" style={{ position: 'relative', zIndex: 1 }}><button type="button" className="modalCancelBtn" onClick={() => setShowTicketModal(false)}>Отмена</button><button type="submit" className="modalSubmitBtn" disabled={isSubmittingTicket}>{isSubmittingTicket ? 'Отправка...' : 'Создать'}</button></div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      );
    }

    if (activeProfileScreen === 'settings') {
      return (
        <motion.div key="settings" variants={slideVariants} initial="initial" animate="in" exit="out">
          <div className="deviceDetailHeader"><button className="backButton" onClick={() => setActiveProfileScreen(null)}><ChevronLeft size={24} /></button><h1 style={{ margin: 0 }}>Настройки</h1></div>
          <div className="profile-menu-group">
            
            {/* 🌟 УЛЬТРА-АНИМИРОВАННЫЙ ТУМБЛЕР ТЕМЫ */}
            <div 
              className="profile-menu-item" 
              onClick={() => setIsDarkMode(!isDarkMode)}
              style={{ cursor: 'pointer' }}
            >
              <div className="profile-menu-left">
                <motion.div
                  initial={false}
                  animate={{ rotate: isDarkMode ? 0 : 180, scale: isDarkMode ? 1 : 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  {isDarkMode ? <Moon size={20} color="var(--accent)" /> : <Sun size={20} color="#f59e0b" />}
                </motion.div>
                {isDarkMode ? 'Тёмная тема' : 'Светлая тема'}
              </div>
              
              {/* Кастомный ползунок на базе Framer Motion */}
              <div style={{
                width: '52px', height: '32px', borderRadius: '16px',
                background: isDarkMode ? 'var(--accent)' : 'var(--bg-input)',
                border: '1px solid ' + (isDarkMode ? 'var(--accent)' : 'var(--border-color)'),
                display: 'flex', alignItems: 'center', padding: '3px',
                justifyContent: isDarkMode ? 'flex-end' : 'flex-start',
                transition: 'background 0.3s ease, border-color 0.3s ease'
              }}>
                <motion.div 
                  layout
                  transition={{ type: "spring", stiffness: 700, damping: 30 }}
                  style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                  }}
                >
                  <motion.div
                    initial={false}
                    animate={{ rotate: isDarkMode ? 360 : 0 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  >
                    {isDarkMode ? <Moon size={14} color="#000" /> : <Sun size={14} color="#f59e0b" />}
                  </motion.div>
                </motion.div>
              </div>
            </div>

            {/* Обычные iOS-style тумблеры */}
            <div className="profile-menu-item">
              <div className="profile-menu-left"><Bell size={20}/> Уведомления в Telegram</div>
              <label className="premiumSwitch" onClick={e => e.stopPropagation()}>
                <input type="checkbox" checked={tgNotifications} onChange={(e) => updateSetting('tgNotifications', e.target.checked)} />
                <span className="slider round"></span>
              </label>
            </div>

            <div className="profile-menu-item">
              <div className="profile-menu-left"><RefreshCw size={20}/> Автопродление VPN</div>
              <label className="premiumSwitch" onClick={e => e.stopPropagation()}>
                <input type="checkbox" checked={autoRenewVpn} onChange={(e) => updateSetting('autoRenewVpn', e.target.checked)} />
                <span className="slider round"></span>
              </label>
            </div>

            <div className="profile-menu-item">
              <div className="profile-menu-left"><RefreshCw size={20}/> Автопродление Gemini</div>
              <label className="premiumSwitch" onClick={e => e.stopPropagation()}>
                <input type="checkbox" checked={autoRenewGemini} onChange={(e) => updateSetting('autoRenewGemini', e.target.checked)} />
                <span className="slider round"></span>
              </label>
            </div>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div key="profileMain" variants={fadeVariants} initial="initial" animate="in" exit="out">
        <ScreenHeader title="Профиль" />
        <div className="profile-header">
          <div className="profile-avatar">{user?.username?.charAt(0)?.toUpperCase() || 'U'}</div>
          <div><h2 style={{ fontSize: '20px', margin: 0, color: 'var(--text-primary)' }}>{user?.username || 'Пользователь'}</h2><p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '14px' }}>ID: {user?.telegramId}</p></div>
        </div>
        <div className="profile-menu-group">
          <button className="profile-menu-item" onClick={() => setDeepScreen({ type: 'history' })}><div className="profile-menu-left"><RefreshCcw size={20} /> История</div><ChevronRight size={20} color="var(--text-secondary)" /></button>
          {user?.isAdmin && <button className="profile-menu-item" onClick={() => navigate('/admin')}><div className="profile-menu-left"><ShieldCheck size={20} /> Админ-панель</div><ChevronRight size={20} color="var(--text-secondary)" /></button>}
          <button className="profile-menu-item" onClick={() => setActiveProfileScreen('settings')}><div className="profile-menu-left"><Settings size={20} /> Настройки</div><ChevronRight size={20} color="var(--text-secondary)" /></button>
          <button className="profile-menu-item" onClick={() => setActiveProfileScreen('support')}><div className="profile-menu-left"><LifeBuoy size={20} /> Поддержка</div><ChevronRight size={20} color="var(--text-secondary)" /></button>
        </div>
        <div className="profile-menu-group">
          <button className="profile-menu-item danger" onClick={() => { logout(); navigate('/'); }}><div className="profile-menu-left"><LogOut size={20} /> Выйти из аккаунта</div></button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="app-container">
      <div className="scroll-area">
        <div className="scroll-area-inner" style={{ height: deepScreen?.type === 'ticket' ? '100%' : 'auto' }}>
          <AnimatePresence mode="wait">
            {/* Рендерим Глубокие Экраны, если они активны */}
            {deepScreen?.type === 'history' ? (
              <HistoryScreen key="history" onClose={() => setDeepScreen(null)} onGoToTopup={() => { setDeepScreen(null); setActiveTab('wallet'); }} />
            ) : deepScreen?.type === 'device' ? (
              <DeviceDetailScreen key="device" deviceId={deepScreen.id} onClose={() => setDeepScreen(null)} />
            ) : deepScreen?.type === 'ticket' ? (
              <TicketChatScreen key="ticket" ticketId={deepScreen.id} onClose={() => setDeepScreen(null)} />
            ) : (
              /* Иначе рендерим стандартные табы */
              <div key="tabs" style={{ width: '100%' }}>
                {activeTab === 'services' && renderServicesTab()}
                {activeTab === 'wallet' && renderWalletTab()}
                {activeTab === 'profile' && renderProfileTab()}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Показываем нижнее меню только если НЕ открыт глубокий экран */}
      <AnimatePresence>
        {!deepScreen && (
          <motion.div className="bottom-nav" initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}>
            {[
              { id: 'services', icon: Shield, label: 'Сервисы' },
              { id: 'wallet', icon: Wallet, label: 'Кошелек' },
              { id: 'profile', icon: User, label: 'Профиль' }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as Tab);
                    if (tab.id !== 'services') setActiveService(null);
                    if (tab.id !== 'profile') setActiveProfileScreen(null);
                  }}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="nav-label">{tab.label}</span>
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {showVpnAddModal && (
          <AddDeviceModal onClose={() => setShowVpnAddModal(false)} onAdd={handleAddDevice} tgUserId={user?.telegramId?.toString() || "0"} />
        )}
      </AnimatePresence>
    </div>
  );
}