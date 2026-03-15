import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rss, Wallet, User, ChevronRight, 
  Settings, ShieldCheck, LogOut,
  ChevronLeft, Plus, Bell, Moon, Sun, 
  // MessageSquare, 
  Bitcoin, Globe, Bug, Lightbulb, MessageCircle, 
  Headset, CreditCard, ChevronDown, ArrowDownToLine, RefreshCcw, 
  Edit2, Trash2, Smartphone, Check, AlertTriangle, 
  Copy, RefreshCw, X, Timer, Send, Info, Clock, CheckCircle2, BellRing,
  Eye, EyeOff, LogIn, ShieldAlert, Lock, Paintbrush, BookOpen
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useBalance } from '../hooks/useBalance';
import { useDevices } from '../hooks/useDevices';
import { useTransactions } from '../hooks/useTransactions';
import { client } from '../api/client';
import { toast } from 'sonner';
import 'flag-icons/css/flag-icons.min.css';

import BalanceCard from "../components/BalanceCard";
import DevicesCard from "../components/DevicesCard";
import AddDeviceModal from "../components/AddDeviceModal";
import AvatarUploader from '../components/AvatarUploader';

import '../styles/appview.css';

// ==========================================
// ТИПЫ И КОНСТАНТЫ
// ==========================================
type Tab = 'services' | 'wallet' | 'profile';
type Service = null | 'vpn' | 'gemini';
type ProfileScreen = null | 'settings' | 'support' | 'security' | 'faq'; 
type DeepScreen = null | { type: 'history' } | { type: 'device'; id: number } | { type: 'ticket'; id: number };

const API_URL = 'https://h4zdeen.up.railway.app';

// const PRESET_AMOUNTS = [100, 300, 500]; // Для старого кошелька

// Официальная иконка Gemini
const CustomGeminiIcon = () => (
  <svg 
    fill="currentColor" 
    fillRule="evenodd" 
    height="32" 
    width="32" 
    style={{ flex: 'none', lineHeight: 1 }} 
    viewBox="0 0 24 24" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z"></path>
  </svg>
);

const TOPICS = [
  { id: 'payment', label: 'Вопрос по оплате', icon: <CreditCard size={18} /> },
  { id: 'vpn', label: 'Не работает VPN', icon: <Globe size={18} /> },
  { id: 'bug', label: 'Ошибка в приложении', icon: <Bug size={18} /> },
  { id: 'idea', label: 'Предложение / Идея', icon: <Lightbulb size={18} /> },
  { id: 'other', label: 'Другое', icon: <MessageCircle size={18} /> },
];

const slideVariants = { initial: { opacity: 0, x: 20 }, in: { opacity: 1, x: 0 }, out: { opacity: 0, x: -20 } };
const fadeVariants = { initial: { opacity: 0, y: 10 }, in: { opacity: 1, y: 0 }, out: { opacity: 0, y: -10 } };
const pageTransition = { initial: { opacity: 0, scale: 0.96 }, in: { opacity: 1, scale: 1 }, out: { opacity: 0, scale: 1.04 } };

// ==========================================
// 1. ЭКРАН ЛОГИНА
// ==========================================
const LoginScreen = ({ onLoginSuccess }: { onLoginSuccess: () => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { setUser } = useAuth();
  
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') !== 'light');

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    if (newTheme) {
      document.body.removeAttribute('data-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error('Введите username и пароль');
      return;
    }

    setLoading(true);
    try {
      const response = await client.auth.login(username, password);
      localStorage.setItem('user', JSON.stringify(response.user));
      setUser(response.user);
      toast.success(`Добро пожаловать, ${response.user.username || username}!`);
      setIsSuccess(true); 
      setTimeout(() => { onLoginSuccess(); }, 1500);
    } catch (error: any) {
      if (error.message?.includes('Пароль не установлен')) {
        toast.error('Пароль не установлен. Напишите /setpass в боте');
      } else if (error.message?.includes('Неверный пароль')) {
        toast.error('Неверный пароль');
      } else {
        toast.error('Ошибка входа');
      }
      setLoading(false);
    }
  };

  return (
    <motion.div className="loginPage" variants={pageTransition} initial="initial" animate="in" exit="out" transition={{ duration: 0.4 }}>
      <motion.button className="loginThemeBtn" onClick={toggleTheme} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
      </motion.button>

      <div className="loginContainer">
        <motion.div className="loginCard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}>
          <AnimatePresence mode="wait">
            {!isSuccess ? (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}>
                <div className="loginHeader">
                  <div className="loginIconWrapper"><ShieldCheck size={32} className="loginHeaderIcon" /></div>
                  <h1 className="loginTitle">PRIME GO Services</h1>
                  <p className="loginDescription">Введите ваш Telegram username и пароль</p>
                </div>
                
                <form onSubmit={handleSubmit} className="loginForm">
                  <div className="inputGroup">
                    <div className="inputIconWrapper"><User size={18} /></div>
                    <input type="text" className="loginInput" placeholder="Login (default: Username (with out @))" value={username} onChange={(e) => setUsername(e.target.value)} disabled={loading} />
                  </div>
                  
                  <div className="inputGroup">
                    <div className="inputIconWrapper"><Lock size={18} /></div>
                    <input type={showPassword ? "text" : "password"} className="loginInput" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
                    <button type="button" className="eyeButton" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  
                  <motion.button type="submit" className="loginButton" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    {loading ? <span className="loader"></span> : <><LogIn size={20} /><span>Войти</span></>}
                  </motion.button>
                </form>
                
                <div className="loginFooter">
                  <span>Нет пароля? Напишите боту:</span>
                  <a href="https://t.me/primego_vpn_bot" target="_blank" rel="noopener noreferrer" className="botButton">@primego_vpn_bot</a>
                </div>
              </motion.div>
            ) : (
              <motion.div key="success" className="successState" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}>
                <div className="successCircle">
                  <motion.svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="checkIcon">
                    <motion.polyline points="20 6 9 17 4 12" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.2 }} />
                  </motion.svg>
                </div>
                <h2>Успешный вход!</h2>
                <p>Перенаправление...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
};

// ==========================================
// 2. ЭКРАН ТЕХ. РАБОТ
// ==========================================
const MaintenanceScreen = ({ onLogout }: { onLogout: () => void }) => (
  <motion.div className="loginPage" variants={pageTransition} initial="initial" animate="in" exit="out" transition={{ duration: 0.4 }}>
    <div className="loginContainer">
      <motion.div className="loginCard maintenanceCard" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, type: "spring" }}>
        <div className="maintenanceHeader">
          <motion.button className="logoutButton maintenanceLogoutBtn" onClick={onLogout} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} title="Выйти из аккаунта">
            <LogOut size={20} className="maintenanceLogoutIcon" />
          </motion.button>
        </div>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 8, ease: "linear" }} className="maintenanceSpinner">
          <Settings size={64} strokeWidth={1.5} />
        </motion.div>
        
        <h1 className="loginTitle maintenanceTitle">Технические работы</h1>
        <p className="loginDescription maintenanceDesc">
          Прямо сейчас мы обновляем сервера, чтобы VPN работал еще быстрее и стабильнее. <br/><br/> Пожалуйста, возвращайтесь немного позже! 🚀
        </p>

        <div className="loginFooter maintenanceFooter">
          <div className="maintenanceWarning">
            <ShieldAlert size={18} />
            <span className="maintenanceWarningText">Ваши данные и подписки в безопасности</span>
          </div>
        </div>
      </motion.div>
    </div>
  </motion.div>
);

// ==========================================
// 3. ВНУТРЕННИЕ ЭКРАНЫ ПРИЛОЖЕНИЯ
// ==========================================
const HistoryScreen = ({ onClose, onGoToTopup }: { onClose: () => void, onGoToTopup: () => void }) => {
  const { transactions, loading: transactionsLoading } = useTransactions();
  const { balance, loading: balanceLoading } = useBalance();

  if (transactionsLoading || balanceLoading) {
    return (
      <motion.div className="historyPage" variants={slideVariants} initial="initial" animate="in" exit="out">
        <div className="historyHeader">
          <button className="backButton" onClick={onClose}><ChevronLeft size={24} /></button>
          <h1 className="screenHeaderTitle">История</h1>
          <div className="emptySpace44" />
        </div>
        <div className="loadingMessage loadingMessageCenter">⏳ Загрузка...</div>
      </motion.div>
    );
  }

  return (
    <motion.div className="historyPage" variants={slideVariants} initial="initial" animate="in" exit="out">
      <div className="historyHeader">
        <button className="backButton" onClick={onClose}><ChevronLeft size={24} /></button>
        <h1 className="screenHeaderTitle">История</h1>
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
                  <div className={`transactionIcon ${isTopup ? 'isTopup' : 'isWithdraw'}`}>
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
          <div className="supportEmptyState">История пуста</div>
        )}
      </div>
    </motion.div>
  );
};

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

  const handleRenew = async () => {
    toast.loading('Продление подписки...', { id: 'renew' });
    try {
      // 1. Берем текущего юзера из памяти
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

      const response = await fetch(`${API_URL}/devices/${deviceId}/renew`, { 
        method: 'POST', 
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json' // 👈 ОБЯЗАТЕЛЬНО добавляем заголовок
        },
        // 2. Явно передаем userId в теле запроса
        body: JSON.stringify({ userId: currentUser.id }) 
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Ошибка сервера');
      }
      toast.success('Подписка успешно продлена!', { id: 'renew' });
      loadDevice();
    } catch (e: any) { 
      toast.error(e.message || 'Ошибка продления.', { id: 'renew' }); 
    }
  };

  if (loading) return <div className="loadingMessage loadingMessageCenter">Загрузка...</div>;
  if (!device) return null;

  return (
    <motion.div variants={slideVariants} initial="initial" animate="in" exit="out" className="screenWrapperPadding">
      <div className="deviceDetailHeader">
        <button className="backButton" onClick={onClose}><ChevronLeft size={24} /></button>
        <h1 className="screenHeaderTitle">Настройки</h1>
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
            <div className="deviceNameDisplay deviceNameDisplayWrap">
              <h2>{device.name}</h2>
              <button onClick={() => setIsEditing(true)} className="editNameBtn"><Edit2 size={14} /></button>
              
              <span className="countryBadge md">
                <span className={`fi fi-${device.location === 'at' ? 'at' : 'ch'}`}></span>
                {device.location === 'at' ? 'AT' : 'CH'}
              </span>
            </div>
          )}
          <p className="deviceProfileModel">{device.model || 'VPN Устройство'}</p>
          <div className="deviceProfileStatus deviceProfileStatusMargin">
            {device.daysLeft > 3 ? (
              /* ОСТАЛОСЬ БОЛЬШЕ 3 ДНЕЙ: Стандартный статус */
              <>
                <span className={`statusBadge ${device.isActive ? 'active' : 'inactive'}`}>
                  {device.isActive ? '● Активно' : '○ Неактивно'}
                </span>
                <span className="daysBadge"><Timer size={14} /> {device.daysLeft} дн.</span>
              </>
            ) : device.daysLeft > 0 && device.daysLeft <= 3 ? (
              /* ОСТАЛОСЬ ОТ 1 ДО 3 ДНЕЙ: Кнопка слева, дни справа */
              <>
                <motion.button 
                  className="addButton" 
                  onClick={handleRenew} 
                  whileHover={{ scale: 1.02 }} 
                  whileTap={{ scale: 0.98 }}
                  style={{ padding: '6px 12px', fontSize: '13px', marginRight: '8px' }}
                >
                  <RefreshCw size={14} /> Продлить
                </motion.button>
                <span className="daysBadge badgeWarning" style={{ color: 'var(--warning)', background: 'var(--warning-alpha)' }}>
                  <Timer size={14} /> {device.daysLeft} дн.
                </span>
              </>
            ) : (
              /* 0 ДНЕЙ: Подписка истекла */
              <motion.button className="addButton danger" onClick={handleRenew} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <RefreshCw size={16} /> Продлить подписку
              </motion.button>
            )}
          </div>
        </div>
      </div>

      <div className="configCard">
        <h3 className="configCardTitle">Конфигурация</h3>
        <p className="configCardDescription">Скопируйте ссылку и вставьте в приложение v2RayTun</p>
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

const TicketChatScreen = ({ ticketId, onClose }: { ticketId: number, onClose: () => void }) => {
  const [ticket, setTicket] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = '52px'; 
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`; 
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || sending || ticket?.status === 'CLOSED') return;
    setSending(true);
    const tempMsg = { id: Date.now(), text: newMessage, isAdmin: false, createdAt: new Date().toISOString() };
    setTicket({ ...ticket, messages: [...ticket.messages, tempMsg] });
    setNewMessage('');
    
    if (textareaRef.current) textareaRef.current.style.height = '52px';

    try {
      await fetch(`${API_URL}/tickets/${ticketId}/message`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: tempMsg.text, isAdmin: false }) });
      loadTicket(false);
    } catch (e) { toast.error('Ошибка'); loadTicket(false); } finally { setSending(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) return <div className="loadingMessage loadingMessageCenter">Загрузка чата...</div>;
  if (!ticket) return null;
  const isClosed = ticket.status === 'CLOSED';

  return (
    <motion.div className="chatContainer chatContainerFull" variants={slideVariants} initial="initial" animate="in" exit="out">
      <div className="chatHeader chatHeaderNoBorder">
        <div className="chatHeaderLeft">
          <button className="backButton" onClick={onClose}><ChevronLeft size={24} /></button>
          <div className="chatTitleInfo">
            <h1 className="chatTitle">{ticket.topic}</h1>
            <span className={`chatStatus ${isClosed ? 'closed' : 'open'}`}>{isClosed ? 'Закрыт' : 'Агент на связи'}</span>
          </div>
        </div>
      </div>

      <div className="chatMessagesArea chatMessagesAreaPad">
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

      <div className="chatInputArea chatInputAreaPad">
        {isClosed ? (
          <div className="chatClosedMessage">Вопрос решен. Чат закрыт.</div>
        ) : (
          <form onSubmit={handleSendMessage} className="chatInputForm">
            <textarea 
              ref={textareaRef}
              className="modalInput chatInputField" 
              value={newMessage} 
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="Сообщение..." 
              rows={1}
            />
            <button type="submit" className={`chatSendBtn ${newMessage.trim() ? 'active' : 'disabled'}`} disabled={!newMessage.trim() || sending}><Send size={20} /></button>
          </form>
        )}
      </div>
    </motion.div>
  );
};

// ==========================================
// 4. ГЛАВНОЕ ПРИЛОЖЕНИЕ (Только для авторизованных)
// ==========================================
const MainAppScreen = ({ onLogout }: { onLogout: () => void }) => {
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuth();
  
  const [activeTab, setActiveTab] = useState<Tab>('services');
  const [activeService, setActiveService] = useState<Service>(null);
  const [activeProfileScreen, setActiveProfileScreen] = useState<ProfileScreen>(null);
  const [deepScreen, setDeepScreen] = useState<DeepScreen>(null);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = Array.isArray(notifications) ? notifications.filter(n => !n.isRead).length : 0;

  const [autoRenewVpn, setAutoRenewVpn] = useState(user?.autoRenewVpn || false);
  const [autoRenewGemini, setAutoRenewGemini] = useState(user?.autoRenewGemini || false);
  const [tgNotifications, setTgNotifications] = useState(user?.tgNotifications !== false);
  
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') !== 'light');
  const [isTelegramTheme, setIsTelegramTheme] = useState(() => localStorage.getItem('tgTheme') === 'true');

  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingSecurity, setSavingSecurity] = useState(false);

  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketTopic, setTicketTopic] = useState(TOPICS[0].label);
  const [ticketText, setTicketText] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // =========================================================
  // СТАРЫЕ СОСТОЯНИЯ ДЛЯ ОПЛАТЫ И GEMINI (СОХРАНЕНЫ НА БУДУЩЕЕ)
  // =========================================================
  /*
  const [selectedTopup, setSelectedTopup] = useState<number | 'custom'>(100);
  const [customAmount, setCustomAmount] = useState('');
  const [loadingTopup, setLoadingTopup] = useState(false);
  const currentAmount = selectedTopup === 'custom' ? Number(customAmount) : selectedTopup;
  const newBalance = (balance || 0) + (currentAmount || 0);

  const [loadingGemini, setLoadingGemini] = useState(false);
  */

  const handleDeleteAvatar = async () => {
    if (!user?.avatarUrl) return toast.info('У вас не установлена аватарка');
    
    toast.loading('Удаление...', { id: 'delete-avatar' });
    try {
      // Отправляем пустую строку на сервер, чтобы очистить поле
      await client.users.updateAvatar(""); 
      
      const updatedUser = { ...user, avatarUrl: "" };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser as any);
      
      toast.success('Фото профиля удалено', { id: 'delete-avatar' });
    } catch (e: any) { 
      toast.error(e.message || 'Ошибка при удалении', { id: 'delete-avatar' }); 
    }
  };

  const handleRestoreTelegramAvatar = async () => {
    toast.loading('Синхронизация с Telegram...', { id: 'tg-avatar' });
    try {
      const data = await client.users.syncTelegramAvatar();
      if (data.avatarUrl) {
        const updatedUser = { ...user, avatarUrl: data.avatarUrl };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser as any);
        toast.success('Аватарка успешно восстановлена!', { id: 'tg-avatar' });
      } else {
        toast.error(data.message || 'В Telegram не найдено фото', { id: 'tg-avatar' });
      }
    } catch (e: any) {
      toast.error(e.message || 'Ошибка синхронизации', { id: 'tg-avatar' });
    }
  };

  useEffect(() => {
    if (activeProfileScreen === 'security') {
      setNewUsername(user?.username || '');
      setOldPassword('');
      setNewPassword('');
      setIsEditingUsername(false);
    }
  }, [activeProfileScreen, user]);

  useEffect(() => {
    if (isTelegramTheme) {
      document.body.setAttribute('data-theme', 'liquid-glass');
      localStorage.setItem('tgTheme', 'true');
    } else {
      localStorage.setItem('tgTheme', 'false');
      if (isDarkMode) { document.body.removeAttribute('data-theme'); localStorage.setItem('theme', 'dark'); } 
      else { document.body.setAttribute('data-theme', 'light'); localStorage.setItem('theme', 'light'); }
    }
  }, [isDarkMode, isTelegramTheme]);

  useEffect(() => {
    if (user?.telegramId) {
      fetch(`${API_URL}/user/${user.telegramId}/notifications`)
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setNotifications(data); else setNotifications([]); })
        .catch(() => setNotifications([]));
    }
  }, [user]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (activeProfileScreen === 'support') {
      setLoadingTickets(true);
      loadTickets(); 
      
      interval = setInterval(() => {
        loadTickets(); 
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeProfileScreen, user]);

  const updateSetting = async (key: string, value: boolean) => {
    if (!user) return;
    try {
      if (key === 'autoRenewVpn') setAutoRenewVpn(value);
      if (key === 'autoRenewGemini') setAutoRenewGemini(value);
      if (key === 'tgNotifications') setTgNotifications(value);

      await fetch(`${API_URL}/user/${user?.telegramId}/settings`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [key]: value })
      });
      const updatedUser = { ...user, [key]: value };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser as any);
    } catch (e) { toast.error('Ошибка сохранения настроек'); }
  };

  const markAsRead = async () => {
    if (unreadCount === 0) return;
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    await fetch(`${API_URL}/user/${user?.telegramId}/notifications/read`, { method: 'POST' });
  };
  
  const [showVpnAddModal, setShowVpnAddModal] = useState(false);
  const { addDevice } = useDevices();
  const { 
    // balance, 
    refetch: refetchBalance } = useBalance();

  const handleSaveUsername = async () => {
    if (!newUsername.trim() || !user) return;
    try {
      setSavingSecurity(true);
      await client.users.updateUsername(newUsername);
      
      const updatedUser = { ...user, username: newUsername };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser); 
      
      toast.success('Логин успешно обновлен');
      setIsEditingUsername(false);
    } catch(e: any) { 
      toast.error(e.message || 'Ошибка при сохранении логина'); 
    } finally { 
      setSavingSecurity(false); 
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) return;
    try {
      setSavingSecurity(true);
      await client.users.updatePassword(oldPassword, newPassword);
      toast.success('Пароль успешно изменен');
      setOldPassword('');
      setNewPassword('');
    } catch(e: any) { 
      toast.error(e.message || 'Неверный текущий пароль или ошибка сервера'); 
    } finally { 
      setSavingSecurity(false); 
    }
  };

  const handleAddDevice = async (name: string, customName: string, type: any, location: string) => {
    try {
      await addDevice(name, customName, type, location); 
      refetchBalance(); 
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) { throw e; }
  };

  const loadTickets = async () => {
    try {
      if (!user) return;
      const response = await fetch(`${API_URL}/tickets/user/${user.telegramId}`);
      setTickets(await response.json());
    } catch (e) { 
      console.error('Ошибка загрузки обращений'); 
    } finally { 
      setLoadingTickets(false); 
    }
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

  // =========================================================
  // СТАРЫЕ ФУНКЦИИ ОПЛАТЫ И GEMINI (СОХРАНЕНЫ НА БУДУЩЕЕ)
  // =========================================================
  /*
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
  */

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN': 
        return (
          <div className="daysBadge badgeWarning">
            <Clock size={14} /> Открыт
          </div>
        );
      case 'ANSWERED': 
        return (
          <div className="daysBadge badgeAccent">
            <MessageCircle size={14} /> Ждет ответа
          </div>
        );
      case 'CLOSED': 
        return (
          <div className="daysBadge badgeSuccess">
            <CheckCircle2 size={14} /> Решен
          </div>
        );
      default: return null;
    }
  };

  const ScreenHeader = ({ title }: { title: string }) => (
    <div className="topBar">
      <h1 className="screenHeaderTitle">{title}</h1>
      
      <div className="headerActions">
        <div className="bellBtn" onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) markAsRead(); }}>
          <motion.div 
            animate={unreadCount > 0 ? { rotate: [0, -15, 15, -15, 15, 0] } : { rotate: 0 }} 
            transition={{ repeat: unreadCount > 0 ? Infinity : 0, repeatDelay: 3, duration: 0.5 }}
            className="flexDisplay"
          >
            {unreadCount > 0 ? <BellRing size={20} /> : <Bell size={20} />}
          </motion.div>
          {unreadCount > 0 && (
            <motion.span 
              className="unreadBadge"
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}
            >
              {unreadCount}
            </motion.span>
          )}
        </div>

        <AnimatePresence>
          {showNotifications && (
            <>
              <div 
                className="menuBackdrop notifBackdrop" 
                onClick={(e) => { e.stopPropagation(); setShowNotifications(false); }} 
              />
              
              <motion.div 
                className="notificationsDropdown notifDropdownPos"
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
              >
                <h3 className="notificationsTitle">Уведомления</h3>
                {notifications.length === 0 ? (
                  <p className="notificationsEmpty">Нет новых уведомлений</p>
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
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  const renderServicesTab = () => {
    if (!activeService) {
      return (
        <motion.div key="grid" variants={fadeVariants} initial="initial" animate="in" exit="out">
          <ScreenHeader title="Сервисы" />
          <div className="services-grid">
            <motion.div 
              className="service-card" 
              onClick={() => setActiveService('vpn')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <motion.div 
                className="service-icon-wrapper"
                animate={{ y: [0, -4, 0] }} 
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              >
                <Rss size={28} />
              </motion.div>
              <span className="service-title">Prime VPN</span>
            </motion.div>

            <motion.div 
              className="service-card" 
              onClick={() => setActiveService('gemini')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <motion.div 
                className="service-icon-wrapper ai"
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1],
                }} 
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              >
                <CustomGeminiIcon />
              </motion.div>
              <span className="service-title">Gemini AI</span>
              
            </motion.div>
          </div>
        </motion.div>
      );
    }

    if (activeService === 'vpn') {
      return (
        <motion.div key="vpn" variants={slideVariants} initial="initial" animate="in" exit="out">
          <div className="deviceDetailHeader">
            <button className="backButton" onClick={() => setActiveService(null)}><ChevronLeft size={24} /></button>
            <h1 className="screenHeaderTitle">Prime VPN</h1>
          </div>
          <BalanceCard />
          <div className="actionsRow">
            <button className="actionBtnSmall" onClick={() => setActiveTab('wallet')}><Wallet size={20} /> Пополнить</button>
            <button className="actionBtnSmall" onClick={() => setDeepScreen({ type: 'history' })}>
              <motion.div whileHover={{ rotate: 180 }} whileTap={{ rotate: 360 }} transition={{ duration: 0.3 }} className="flexDisplay">
                <RefreshCcw size={20} />
              </motion.div> 
              История
            </button>
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
            <h1 className="screenHeaderTitle">Gemini AI</h1>
          </div>
          <BalanceCard />
          <div className="actionsRow">
            <button className="actionBtnSmall" onClick={() => setActiveTab('wallet')}><Wallet size={20} /> Пополнить</button>
            <button className="actionBtnSmall" onClick={() => setDeepScreen({ type: 'history' })}>
              <motion.div whileHover={{ rotate: 180 }} whileTap={{ rotate: 360 }} transition={{ duration: 0.3 }} className="flexDisplay">
                <RefreshCcw size={20} />
              </motion.div> 
              История
            </button>
          </div>
          
          {/* ========================================================= */}
          {/* СТАРАЯ КАРТОЧКА С КНОПКОЙ ЗАЯВКИ (СОХРАНЕНА НА БУДУЩЕЕ)   */}
          {/* ========================================================= */}
          {/* <div className="configCard geminiInfoCard">
            <div className="geminiHeaderRow">
              <div className="geminiIconWrap"><Sparkles size={24} /></div>
              <div><h2 className="geminiCardTitle">Умный помощник</h2><p className="geminiCardSubtitle">Нейросеть нового поколения</p></div>
            </div>
            <ul className="geminiList">
              <li>Генерация текстов и кода любой сложности</li>
              <li>Помощь в решении повседневных задач</li>
            </ul>
            <motion.button className="geminiSubmitBtn" onClick={handleRequestGemini} disabled={loadingGemini} whileTap={{ scale: 0.98 }}>
              {loadingGemini ? 'Создание заявки...' : <><MessageSquare size={20} /> Получить доступ</>}
            </motion.button>
            <p className="geminiDisclaimer">После нажатия будет создан диалог с поддержкой для активации услуги.</p>
          </div> */}

          {/* ========================================================= */}
          {/* АКТИВНАЯ КАРТОЧКА "В РАЗРАБОТКЕ"                          */}
          {/* ========================================================= */}
          <div className="configCard devCard">
            <motion.div 
              animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }} 
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
              className="devIconWrap warning"
            >
              <Clock size={40} />
            </motion.div>
            
            <h2 className="devTitle">Скоро появится</h2>
            
            <p className="devDesc">
              Мы готовим для вас интеграцию с мощнейшей нейросетью нового поколения. <br/><br/>
              Генерация текстов, написание кода и ответы на любые вопросы! ✨
            </p>

            <div className="devBadge">
              В активной разработке 🛠
            </div>
          </div>
        </motion.div>
      );
    }
  };

  const renderWalletTab = () => (
    <motion.div key="wallet" variants={fadeVariants} initial="initial" animate="in" exit="out">
      <ScreenHeader title="Кошелек" />
      
      <BalanceCard />

      {/* ========================================================= */}
      {/* СТАРАЯ ОПЛАТА С ИНПУТАМИ (СОХРАНЕНА НА БУДУЩЕЕ)            */}
      {/* ========================================================= */}
      {/*
      <div className="balancePreview">
        <span className="previewLabel">Баланс после пополнения</span>
        <span className="previewAmount">{newBalance} ₽</span>
      </div>
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
      <div className="infoMessage"><Wallet size={20} className="infoIcon" /><p>Средства зачисляются моментально.</p></div>
      <motion.button className="payButton" onClick={handlePay} disabled={loadingTopup || (selectedTopup === 'custom' && currentAmount < 50)} whileTap={{ scale: 0.98 }}>
        <Bitcoin size={20} /> {loadingTopup ? 'Создание счета...' : `Пополнить на ${currentAmount || 0} ₽`}
      </motion.button>
      */}

      {/* ========================================================= */}
      {/* АКТИВНАЯ КАРТОЧКА "ОПЛАТА В РАЗРАБОТКЕ"                     */}
      {/* ========================================================= */}
      <div className="configCard devCard walletCard">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }} 
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          className="devIconWrap warning"
        >
          <Clock size={40} />
        </motion.div>
        
        <h2 className="devTitle wallet">Оплата в разработке</h2>
        
        <p className="devDesc wallet">
          В данный момент автоматический шлюз оплаты находится на обновлении. <br/><br/>
          Чтобы пополнить баланс, совершите перевод по{' '}
          <span 
            onClick={() => {
              // Вставь сюда реальный номер карты или телефона
              navigator.clipboard.writeText('4377 7237 8841 3734'); 
              toast.success('Реквизиты скопированы!');
            }}
            style={{ 
              color: 'var(--warning)', 
              cursor: 'pointer', 
              fontWeight: 700,
              textDecoration: 'underline',
              textUnderlineOffset: '4px',
              textDecorationThickness: '2px'
            }}
            title="Нажмите, чтобы скопировать"
          >
            реквизитам
          </span>
          {' '}и <b>отправьте чек в нашу службу поддержки</b>. Средства будут зачислены на ваш аккаунт в течение пары минут.
        </p>

        <a 
          href="https://t.me/Prime_Go_ADMIN" 
          target="_blank" 
          rel="noopener noreferrer"
          className="textDecorationNone"
        >
          <motion.button 
            className="payButton fullWidthBtn" 
            whileTap={{ scale: 0.98 }}
          >
            <Send size={20} /> Написать в поддержку
          </motion.button>
        </a>
      </div>
    </motion.div>
  );

  const renderProfileTab = () => {
    if (activeProfileScreen === 'faq') {
      return <FaqScreen key="faq" onClose={() => setActiveProfileScreen(null)} />;
    }
    
    if (activeProfileScreen === 'security') {
      return (
        <motion.div key="security" variants={slideVariants} initial="initial" animate="in" exit="out">
          <div className="deviceDetailHeader">
            <button className="backButton" onClick={() => setActiveProfileScreen(null)}><ChevronLeft size={24} /></button>
            <h1 className="screenHeaderTitle">Безопасность</h1>
          </div>

          <div className="configCard securityCardMargin">
            <div className="geminiHeaderRow">
              <div className="geminiIconWrap iconWrapAccent">
                <User size={24} />
              </div>
              <div>
                <h2 className="geminiCardTitle">Логин (Username)</h2>
                <p className="geminiCardSubtitle">Для входа в приложение</p>
              </div>
            </div>
            
            {isEditingUsername ? (
              <div className="deviceNameEdit securityEditWrap">
                <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} autoFocus placeholder="Введите новый логин" />
                <button onClick={handleSaveUsername} disabled={savingSecurity} className="saveNameBtn"><Check size={16} /></button>
              </div>
            ) : (
              <div className="deviceNameDisplay securityDisplayWrap">
                <span className="securityUsernameText">{user?.username}</span>
                <button onClick={() => setIsEditingUsername(true)} className="editNameBtn securityEditIconBtn">
                  <Edit2 size={18} />
                </button>
              </div>
            )}
          </div>

          <div className="configCard">
            <div className="geminiHeaderRow">
              <div className="geminiIconWrap iconWrapDanger">
                <Lock size={24} />
              </div>
              <div>
                <h2 className="geminiCardTitle">Изменить пароль</h2>
                <p className="geminiCardSubtitle">Должен быть надежным</p>
              </div>
            </div>
            <form onSubmit={handleChangePassword} className="securityForm">
              <input type="password" placeholder="Текущий пароль" className="modalInput securityInput" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
              <input type="password" placeholder="Новый пароль" className="modalInput securityInput" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              <motion.button type="submit" className="modalSubmitBtn securitySubmitBtn" disabled={savingSecurity || !oldPassword || !newPassword} whileTap={{ scale: 0.98 }}>
                {savingSecurity ? 'Сохранение...' : 'Обновить пароль'}
              </motion.button>
            </form>
          </div>
        </motion.div>
      );
    }

    if (activeProfileScreen === 'support') {
      const currentTopicObj = TOPICS.find(t => t.label === ticketTopic) || TOPICS[0];
      
      return (
        <motion.div key="support" variants={slideVariants} initial="initial" animate="in" exit="out">
          <div className="deviceDetailHeader"><button className="backButton" onClick={() => setActiveProfileScreen(null)}><ChevronLeft size={24} /></button><h1 className="screenHeaderTitle">Поддержка</h1></div>
          <div className="infoMessage"><Headset className="infoIcon" size={20} /><div>Служба поддержки работает с 10:00 до 22:00. Отвечаем в течение 15 минут.</div></div>
          <div className="devicesCardHeader">
            <div className="devicesCardTitle"><h2 className="sectionTitle">Мои обращения</h2>{!loadingTickets && <span className="devicesCount">{tickets.length}</span>}</div>
            <button className="addButton" onClick={() => setShowTicketModal(true)}><Plus size={18} /> Новое</button>
          </div>
          <div className="ticketsList">
            {loadingTickets ? <div className="supportLoadingScreen"><div className="toast-spinner"></div></div> : tickets.length === 0 ? <div className="supportEmptyState"><MessageCircle size={48} className="supportEmptyIcon"/>Нет обращений</div> : (
              tickets.map((ticket) => (
                <div key={ticket.id} className="deviceCard" onClick={() => setDeepScreen({ type: 'ticket', id: ticket.id })}>
                  <div className="deviceIcon"><MessageCircle size={24} /></div>
                  <div className="deviceInfo">
                    <div className="deviceNameWrapper"><span className="deviceName">{ticket.topic}</span></div>
                    <div className="deviceDate">Тикет #{ticket.id} • {new Date(ticket.updatedAt).toLocaleDateString()}</div>
                  </div>
                  {getStatusBadge(ticket.status)}
                  <ChevronRight className="deviceChevron" size={20} />
                </div>
              ))
            )}
          </div>
          <AnimatePresence>
            {showTicketModal && (
              <div className="modalOverlay">
                <div className="modalBackdrop" onClick={() => setShowTicketModal(false)} />
                <motion.div className="modalSheet" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}>
                  <div className="modalHandle" onClick={() => setShowTicketModal(false)} />
                  <h2 className="modalTitle">Новое обращение</h2>
                  <form onSubmit={handleCreateTicket}>
                    <div className="modalField customDropdownContainer">
                      <label className="modalLabel">Тема обращения</label>
                      <div className="modalInput customDropdownHeader" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                        <div className="customDropdownHeaderContent"><span className="customDropdownIcon">{currentTopicObj.icon}</span><span>{currentTopicObj.label}</span></div>
                        <ChevronDown size={20} className="dropdownIconColor" />
                      </div>
                      <AnimatePresence>
                        {isDropdownOpen && (
                          <motion.div className="customDropdownList" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                            {TOPICS.map((t) => (<div key={t.id} onClick={() => { setTicketTopic(t.label); setIsDropdownOpen(false); }} className={`customDropdownItem ${ticketTopic === t.label ? 'active' : ''}`}><span className="customDropdownIcon">{t.icon}</span> {t.label}</div>))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="modalField modalActionsZIndex"><label className="modalLabel">Описание проблемы</label><textarea className="modalInput textareaNoResize" value={ticketText} onChange={e => setTicketText(e.target.value)} placeholder="Опишите ситуацию..." rows={4} /></div>
                    <div className="modalActionsRow modalActionsZIndex"><button type="button" className="modalCancelBtn" onClick={() => setShowTicketModal(false)}>Отмена</button><button type="submit" className="modalSubmitBtn" disabled={isSubmittingTicket}>{isSubmittingTicket ? 'Отправка...' : 'Создать'}</button></div>
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
          <div className="deviceDetailHeader"><button className="backButton" onClick={() => setActiveProfileScreen(null)}><ChevronLeft size={24} /></button><h1 className="screenHeaderTitle">Настройки</h1></div>
          
          <div className="profile-menu-group">
            <div className="profile-menu-item">
              <div className="profile-menu-left">
                <Paintbrush size={20} color="#3390ec" /> Стиль Telegram
                <span className="betaBadge">BETA</span>
              </div>
              <label className="premiumSwitch" onClick={e => e.stopPropagation()}>
                <input type="checkbox" checked={isTelegramTheme} onChange={(e) => setIsTelegramTheme(e.target.checked)} />
                <span className="slider round"></span>
              </label>
            </div>
          </div>

          <div className="profile-menu-group">
            <div className="profile-menu-item" onClick={() => { if(!isTelegramTheme) setIsDarkMode(!isDarkMode) }}>
              <div className="profile-menu-left">
                <motion.div initial={false} animate={{ rotate: isDarkMode ? 0 : 180, scale: isDarkMode ? 1 : 0.9 }}>
                  {isDarkMode ? <Moon size={20} color="var(--accent)" /> : <Sun size={20} color="#f59e0b" />}
                </motion.div>
                {isDarkMode ? 'Тёмная тема' : 'Светлая тема'}
              </div>
              <div className={`themeToggleTrack ${isTelegramTheme ? 'disabled' : ''} ${isDarkMode ? 'dark' : 'light'}`}>
                <motion.div layout transition={{ type: "spring", stiffness: 700, damping: 30 }} className="themeToggleThumb">
                  <motion.div initial={false} animate={{ rotate: isDarkMode ? 360 : 0 }}>
                    {isDarkMode ? <Moon size={14} color="#000" /> : <Sun size={14} color="#f59e0b" />}
                  </motion.div>
                </motion.div>
              </div>
            </div>

            <div className="profile-menu-item">
              <div className="profile-menu-left"><Bell size={20}/> Уведомления в бот</div>
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
          <div className="profile-menu-group settingsGroupMargin">
            <button className="profile-menu-item" onClick={handleRestoreTelegramAvatar}>
              <div className="profile-menu-left">
                <RefreshCw size={20} color="var(--accent)" /> 
                Восстановить фото из Telegram
              </div>
            </button>
            <button className="profile-menu-item danger" onClick={handleDeleteAvatar}>
              <div className="profile-menu-left">
                <Trash2 size={20} /> 
                Удалить фото профиля
              </div>
            </button>
          </div>
          <div className="profile-menu-group settingsGroupMargin">
            <button className="profile-menu-item" onClick={() => {
              toast.loading('Очистка кэша и обновление...');
              
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
              }
              if ('caches' in window) {
                caches.keys().then((names) => {
                  names.forEach(name => caches.delete(name));
                });
              }
              setTimeout(() => {
                window.location.href = window.location.pathname + '?v=' + new Date().getTime();
              }, 800);
            }}>
              <div className="profile-menu-left">
                <RefreshCcw size={20} color="var(--accent)" /> 
                Обновить приложение
              </div>
              <ChevronRight size={20} color="var(--text-secondary)" />
            </button>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div key="profileMain" variants={fadeVariants} initial="initial" animate="in" exit="out">
        <ScreenHeader title="Профиль" />
        
        <div className="profile-header">
            <AvatarUploader 
              currentAvatar={
                user?.avatarUrl?.startsWith('data:image') || user?.avatarUrl?.startsWith('http') 
                  ? user.avatarUrl 
                  : user?.avatarUrl ? `${API_URL}${user.avatarUrl}` : null
              } 
              username={user?.username || ''} 
              onUpload={async (base64) => {
                await client.users.updateAvatar(base64);
                const updatedUser = { ...user, avatarUrl: base64 };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setUser(updatedUser as any);
                toast.success('Аватарка обновлена!');
              }} 
            />
          <div className="profile-info">
            <h2 className="screenHeaderTitle">{user?.username || 'Пользователь'}</h2>
            <p>ID: {user?.telegramId}</p>
          </div>
        </div>

        <div className="profile-menu-group">
          <button className="profile-menu-item" onClick={() => setActiveProfileScreen('security')}>
            <div className="profile-menu-left"><Lock size={20} /> Безопасность</div>
            <ChevronRight size={20} color="var(--text-secondary)" />
          </button>
          
          <button className="profile-menu-item" onClick={() => setDeepScreen({ type: 'history' })}>
            <div className="profile-menu-left"><RefreshCcw size={20} /> История</div>
            <ChevronRight size={20} color="var(--text-secondary)" />
          </button>
          
          <button className="profile-menu-item" onClick={() => setActiveProfileScreen('faq')}>
            <div className="profile-menu-left"><BookOpen size={20} /> Инструкции (FAQ)</div>
            <ChevronRight size={20} color="var(--text-secondary)" />
          </button>

          {user?.isAdmin && (
            <button className="profile-menu-item" onClick={() => navigate('/admin')}>
              <div className="profile-menu-left"><ShieldCheck size={20} /> Админ-панель</div>
              <ChevronRight size={20} color="var(--text-secondary)" />
            </button>
          )}
          
          <button className="profile-menu-item" onClick={() => setActiveProfileScreen('settings')}>
            <div className="profile-menu-left"><Settings size={20} /> Настройки</div>
            <ChevronRight size={20} color="var(--text-secondary)" />
          </button>
          
          <button className="profile-menu-item" onClick={() => setActiveProfileScreen('support')}>
            <div className="profile-menu-left"><Headset size={20} /> Поддержка</div>
            <ChevronRight size={20} color="var(--text-secondary)" />
          </button>
        </div>

        <div className="profile-menu-group">
          <button className="profile-menu-item danger" onClick={() => { logout(); onLogout(); }}>
            <div className="profile-menu-left"><LogOut size={20} /> Выйти из аккаунта</div>
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div className="app-container" variants={pageTransition} initial="initial" animate="in" exit="out" transition={{ duration: 0.4 }}>
      <div className="scroll-area">
        <div className="scroll-area-inner">
          <AnimatePresence mode="wait">
            {deepScreen?.type === 'history' ? <HistoryScreen key="history" onClose={() => setDeepScreen(null)} onGoToTopup={() => { setDeepScreen(null); setActiveTab('wallet'); }} /> : 
             deepScreen?.type === 'device' ? <DeviceDetailScreen key="device" deviceId={deepScreen.id} onClose={() => setDeepScreen(null)} /> : 
             deepScreen?.type === 'ticket' ? <TicketChatScreen key="ticket" ticketId={deepScreen.id} onClose={() => setDeepScreen(null)} /> : 
              <div key="tabs" className="tabsContainer">
                {activeTab === 'services' && renderServicesTab()}
                {activeTab === 'wallet' && renderWalletTab()}
                {activeTab === 'profile' && renderProfileTab()}
              </div>
            }
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {!deepScreen && (
          <motion.div className="bottom-nav" initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}>
            {[
              { id: 'services', icon: Rss, label: 'Сервисы' },
              { id: 'wallet', icon: Wallet, label: 'Кошелек' },
              { id: 'profile', icon: User, label: 'Профиль' }
            ].map(tab => {
              const Icon = tab.icon as any;
              const isActive = activeTab === tab.id;
              return (
                <button 
                  key={tab.id} 
                  onClick={() => { setActiveTab(tab.id as Tab); setShowNotifications(false); setShowVpnAddModal(false); if (tab.id !== 'services') setActiveService(null); if (tab.id !== 'profile') setActiveProfileScreen(null); }} 
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  <motion.div
                    whileTap={{ scale: 0.8, y: 5 }} 
                    animate={isActive ? { scale: [1, 1.15, 1], y: [0, -2, 0] } : { scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  </motion.div>
                  <span className="nav-label">{tab.label}</span>
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {showVpnAddModal && <AddDeviceModal onClose={() => setShowVpnAddModal(false)} onAdd={handleAddDevice} tgUserId={user?.telegramId?.toString() || "0"} />}
      </AnimatePresence>
    </motion.div>
  );
}

function FaqScreen({ onClose }: { onClose: () => void }) {
  const [expanded, setExpanded] = useState<number | null>(0); 

  const faqs = [
    {
      question: 'Как установить приложение на iOS (iPhone)?',
      answer: (
        <ol className="faqList">
          <li>Откройте этот сайт в стандартном браузере <b>Safari</b>.</li>
          <li>Нажмите на иконку <b>«Поделиться»</b> (квадрат со стрелочкой вверх) внизу экрана.</li>
          <li>Прокрутите меню вниз и выберите пункт <b>«На экран "Домой"»</b> (Add to Home Screen).</li>
          <li>Нажмите <b>«Добавить»</b> в правом верхнем углу.</li>
          <li>Теперь PRIME GO появится среди ваших приложений на главном экране!</li>
        </ol>
      )
    },
    {
      question: 'Как подключить VPN на телефоне?',
      answer: (
        <div className="faqList">
          1. В разделе "Сервисы" создайте новое устройство.<br/>
          2. Скачайте приложение <b>v2RayTun</b> (для iOS) / <b>v2rayNG</b> (для Android).<br/>
          3. Скопируйте ссылку конфигурации из карточки вашего устройства.<br/>
          4. Откройте скачанное приложение и импортируйте ссылку из буфера обмена.
        </div>
      )
    }
  ];

  return (
    <motion.div variants={slideVariants} initial="initial" animate="in" exit="out" className="screenWrapperPadding">
      <div className="deviceDetailHeader">
        <button className="backButton" onClick={onClose}><ChevronLeft size={24} /></button>
        <h1 className="screenHeaderTitle">FAQ</h1>
      </div>
      
      <div className="faqContainer">
        {faqs.map((faq, idx) => (
          <div key={idx} className={`faqItem ${expanded === idx ? 'expanded' : ''}`}>
            <div className="faqHeader" onClick={() => setExpanded(expanded === idx ? null : idx)}>
              <h3>{faq.question}</h3>
              <ChevronDown size={20} className="faqChevron" />
            </div>
            <AnimatePresence>
              {expanded === idx && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="faqContentHidden"
                >
                  <div className="faqContentInner">
                    {faq.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ==========================================
// 5. ОРКЕСТРАТОР APP VIEW
// ==========================================
export default function AppView() {
  const [appState, setAppState] = useState<'checking' | 'login' | 'maintenance' | 'app'>('checking');

  const checkAccess = async () => {
    try {
      setAppState('checking');
      const status = await client.system.getStatus();
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      if (status.maintenance && !user?.isAdmin) {
        setAppState('maintenance');
        return; 
      }

      if (user) {
        setAppState('app');
      } else {
        setAppState('login');
      }
    } catch (error) {
      console.error('Ошибка инициализации приложения:', error);
      const userStr = localStorage.getItem('user');
      setAppState(userStr ? 'app' : 'login'); 
    }
  };

  useEffect(() => {
    checkAccess();
  }, []);

  if (appState === 'checking') return null;

  return (
    <div className="app-wrapper">
      <AnimatePresence mode="wait">
        {appState === 'login' && (
          <LoginScreen key="login" onLoginSuccess={checkAccess} />
        )}
        
        {appState === 'maintenance' && (
          <MaintenanceScreen key="maintenance" onLogout={() => { 
            localStorage.removeItem('user'); 
            setAppState('login'); 
          }} />
        )}
        
        {appState === 'app' && (
          <MainAppScreen key="app" onLogout={() => setAppState('login')} />
        )}
      </AnimatePresence>
    </div>
  );
}