import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Sparkles, Wallet, User, ChevronRight, 
  Settings, ShieldCheck, LifeBuoy, LogOut,
  ChevronLeft, Plus, Bell, Moon, Sun, 
  MessageSquare, Bitcoin, Globe, Bug, Lightbulb, MessageCircle, 
  Headset, CreditCard, ChevronDown, ArrowDownToLine, RefreshCcw, 
  Edit2, Trash2, Smartphone, Check, AlertTriangle, 
  Copy, RefreshCw, X, Timer, Send, Info, Clock, CheckCircle2, BellRing, SmartphoneNfc, Eye, EyeOff, LogIn, ShieldAlert, Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBalance } from '../hooks/useBalance';
import { useDevices } from '../hooks/useDevices';
import { useTransactions } from '../hooks/useTransactions';
import { client } from '../api/client';
import { toast } from 'sonner';
import 'flag-icons/css/flag-icons.min.css';

import BalanceCard from "../components/BalanceCard";
import DevicesCard from "../components/DevicesCard";
import AddDeviceModal from "../components/AddDeviceModal";

import '../styles/appview.css';

// ==========================================
// ТИПЫ И КОНСТАНТЫ
// ==========================================
type Tab = 'services' | 'wallet' | 'profile';
type Service = null | 'vpn' | 'gemini';
type ProfileScreen = null | 'settings' | 'support';
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
      toast.success(`Добро пожаловать, ${response.user.firstName || username}!`);
      setIsSuccess(true); 
      setTimeout(() => { onLoginSuccess(); }, 1500);
    } catch (error: any) {
      if (error.message?.includes('Пароль не установлен')) {
        toast.error('Пароль не установлен. Напишите /setpass в боте');
      } else if (error.message?.includes('Неверный пароль')) {
        toast.error('Неверный пароль');
      } else {
        toast.error(error.message || 'Ошибка входа');
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
                    <input type="text" className="loginInput" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} disabled={loading} />
                  </div>
                  
                  <div className="inputGroup">
                    <div className="inputIconWrapper"><Lock size={18} /></div>
                    <input type={showPassword ? "text" : "password"} className="loginInput" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
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
      <motion.div className="loginCard" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, type: "spring" }} style={{ textAlign: 'center', padding: '50px 30px', position: 'relative' }}>
        <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <motion.button className="logoutButton" onClick={onLogout} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} title="Выйти из аккаунта" style={{ position: 'absolute', top: '16px', right: '16px', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0, zIndex: 10 }}>
            <LogOut size={20} style={{ marginLeft: '-2px' }} />
          </motion.button>
        </div>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 8, ease: "linear" }} style={{ display: 'inline-block', marginBottom: '20px', color: 'var(--text-primary)' }}>
          <Settings size={64} strokeWidth={1.5} />
        </motion.div>
        
        <h1 className="loginTitle" style={{ fontSize: '28px', marginBottom: '12px' }}>Технические работы</h1>
        <p className="loginDescription" style={{ fontSize: '15px', lineHeight: '1.6' }}>
          Прямо сейчас мы обновляем сервера, чтобы VPN работал еще быстрее и стабильнее. <br/><br/> Пожалуйста, возвращайтесь немного позже! 🚀
        </p>

        <div className="loginFooter" style={{ marginTop: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--warning)' }}>
            <ShieldAlert size={18} />
            <span style={{ fontWeight: 600 }}>Ваши данные и подписки в безопасности</span>
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
      const response = await fetch(`${API_URL}/devices/${deviceId}/renew`, { 
        method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } 
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Ошибка');
      }
      toast.success('Подписка успешно продлена!', { id: 'renew' });
      loadDevice();
    } catch (e: any) { 
      toast.error(e.message || 'Ошибка продления.', { id: 'renew' }); 
    }
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '40px' }}>Загрузка...</div>;
  if (!device) return null;

  return (
    <motion.div variants={slideVariants} initial="initial" animate="in" exit="out" style={{ paddingBottom: '40px' }}>
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
            <div className="deviceNameDisplay" style={{ flexWrap: 'wrap' }}>
              <h2>{device.name}</h2>
              <button onClick={() => setIsEditing(true)} className="editNameBtn"><Edit2 size={14} /></button>
              
              <span className="countryBadge md">
                <span className={`fi fi-${device.location === 'at' ? 'at' : 'ch'}`}></span>
                {device.location === 'at' ? 'AT' : 'CH'}
              </span>
            </div>
          )}
          <p className="deviceProfileModel">{device.model || 'VPN Устройство'}</p>
          <div className="deviceProfileStatus" style={{ marginTop: '12px' }}>
            {device.daysLeft > 0 ? (
              <>
                <span className={`statusBadge ${device.isActive ? 'active' : 'inactive'}`}>
                  {device.isActive ? '● Активно' : '○ Неактивно'}
                </span>
                <span className="daysBadge"><Timer size={14} /> {device.daysLeft} дн.</span>
              </>
            ) : (
              <motion.button className="addButton" onClick={handleRenew} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <RefreshCw size={16} /> Продлить подписку
              </motion.button>
            )}
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
      textareaRef.current.style.height = '52px'; // Сначала сбрасываем до минимума
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`; // Растем до 120px
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || sending || ticket?.status === 'CLOSED') return;
    setSending(true);
    const tempMsg = { id: Date.now(), text: newMessage, isAdmin: false, createdAt: new Date().toISOString() };
    setTicket({ ...ticket, messages: [...ticket.messages, tempMsg] });
    setNewMessage('');
    
    // 👈 Сбрасываем высоту инпута после отправки
    if (textareaRef.current) textareaRef.current.style.height = '52px';

    try {
      await fetch(`${API_URL}/tickets/${ticketId}/message`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: tempMsg.text, isAdmin: false }) });
      loadTicket(false);
    } catch (e) { toast.error('Ошибка'); loadTicket(false); } finally { setSending(false); }
  };

  // 👈 Отправка по кнопке Enter (без Shift)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
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
  const { user, logout } = useAuth();
  
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

  const updateSetting = async (key: string, value: boolean) => {
    try {
      if (key === 'autoRenewVpn') setAutoRenewVpn(value);
      if (key === 'autoRenewGemini') setAutoRenewGemini(value);
      if (key === 'tgNotifications') setTgNotifications(value);

      await fetch(`${API_URL}/user/${user?.telegramId}/settings`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [key]: value })
      });
      const updatedUser = { ...user, [key]: value };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (e) { toast.error('Ошибка сохранения настроек'); }
  };

  const markAsRead = async () => {
    if (unreadCount === 0) return;
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    await fetch(`${API_URL}/user/${user?.telegramId}/notifications/read`, { method: 'POST' });
  };
  
  const [showVpnAddModal, setShowVpnAddModal] = useState(false);
  const { addDevice } = useDevices();
  const { balance, refetch: refetchBalance } = useBalance();
  const [selectedTopup, setSelectedTopup] = useState<number | 'custom'>(100);
  const [customAmount, setCustomAmount] = useState('');
  const [loadingTopup, setLoadingTopup] = useState(false);
  const currentAmount = selectedTopup === 'custom' ? Number(customAmount) : selectedTopup;
  const newBalance = (balance || 0) + (currentAmount || 0);

  const [loadingGemini, setLoadingGemini] = useState(false);

  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketTopic, setTicketTopic] = useState(TOPICS[0].label);
  const [ticketText, setTicketText] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN': return <div className="daysBadge" style={{ background: 'var(--warning-alpha)', color: 'var(--warning)' }}><Clock size={14} /> Открыт</div>;
      case 'ANSWERED': return <div className="daysBadge" style={{ background: 'var(--accent-alpha)', color: 'var(--accent)' }}><MessageCircle size={14} /> Ждет ответа</div>;
      case 'CLOSED': return <div className="daysBadge" style={{ background: 'var(--success-alpha)', color: 'var(--success)' }}><CheckCircle2 size={14} /> Решен</div>;
      default: return null;
    }
  };

  const ScreenHeader = ({ title }: { title: string }) => (
    <div className="topBar">
      <h1 className="screenHeaderTitle">{title}</h1>
      <div className="bellBtn" onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) markAsRead(); }}>
        {unreadCount > 0 ? <BellRing size={20} /> : <Bell size={20} />}
        {unreadCount > 0 && <span className="unreadBadge">{unreadCount}</span>}
      </div>

      <AnimatePresence>
        {showNotifications && (
          <>
            <div 
              className="menuBackdrop" 
              style={{ zIndex: 199 }} 
              onClick={() => setShowNotifications(false)} 
            />
            
            <motion.div 
              className="notificationsDropdown"
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
  );

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
              <div className="service-icon-wrapper ai"><Sparkles size={28} /></div>
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
            <h1 className="screenHeaderTitle">Prime VPN</h1>
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
            <h1 className="screenHeaderTitle">Gemini AI</h1>
          </div>
          <BalanceCard />
          <div className="actionsRow">
            <button className="actionBtnSmall" onClick={() => setActiveTab('wallet')}><Wallet size={20} /> Пополнить</button>
            <button className="actionBtnSmall" onClick={() => setDeepScreen({ type: 'history' })}><RefreshCcw size={20} /> История</button>
          </div>
          <div className="configCard geminiInfoCard">
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
          </div>
        </motion.div>
      );
    }
  };

  const renderWalletTab = () => (
    <motion.div key="wallet" variants={fadeVariants} initial="initial" animate="in" exit="out">
      <ScreenHeader title="Кошелек" />
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
    </motion.div>
  );

  const renderProfileTab = () => {
    if (activeProfileScreen === 'support') {
      if (loadingTickets && tickets.length === 0) loadTickets();
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
                    <div className="modalField modalActionsZIndex"><label className="modalLabel">Описание проблемы</label><textarea className="modalInput" value={ticketText} onChange={e => setTicketText(e.target.value)} placeholder="Опишите ситуацию..." rows={4} style={{ resize: 'none' }} /></div>
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
                <SmartphoneNfc size={20} color="#3390ec" /> Стиль Telegram
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
              <div style={{
                width: '52px', height: '32px', borderRadius: '16px', padding: '3px',
                background: isTelegramTheme ? 'var(--bg-input)' : (isDarkMode ? 'var(--accent)' : 'var(--bg-input)'),
                border: '1px solid ' + (isTelegramTheme ? 'var(--border-color)' : (isDarkMode ? 'var(--accent)' : 'var(--border-color)')),
                display: 'flex', alignItems: 'center', justifyContent: isDarkMode ? 'flex-end' : 'flex-start',
                opacity: isTelegramTheme ? 0.5 : 1, transition: 'all 0.3s'
              }}>
                <motion.div layout transition={{ type: "spring", stiffness: 700, damping: 30 }} style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
          <div className="profile-menu-group" style={{ marginTop: '24px' }}>
            <button className="profile-menu-item" onClick={() => {
              toast.loading('Очистка кэша и обновление...');
              
              // 1. Очищаем Service Workers (кэш PWA на iOS)
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
              }
              
              // 2. Очищаем жесткий кэш браузера
              if ('caches' in window) {
                caches.keys().then((names) => {
                  names.forEach(name => caches.delete(name));
                });
              }
              
              // 3. Перезагружаем страницу с уникальным параметром (Cache Buster)
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
          <div className="profile-avatar">{user?.username?.charAt(0)?.toUpperCase() || 'U'}</div>
          <div className="profile-info"><h2 className="screenHeaderTitle">{user?.username || 'Пользователь'}</h2><p>ID: {user?.telegramId}</p></div>
        </div>
        <div className="profile-menu-group">
          <button className="profile-menu-item" onClick={() => setDeepScreen({ type: 'history' })}><div className="profile-menu-left"><RefreshCcw size={20} /> История</div><ChevronRight size={20} color="var(--text-secondary)" /></button>
          {user?.isAdmin && <button className="profile-menu-item" onClick={() => navigate('/admin')}><div className="profile-menu-left"><ShieldCheck size={20} /> Админ-панель</div><ChevronRight size={20} color="var(--text-secondary)" /></button>}
          <button className="profile-menu-item" onClick={() => setActiveProfileScreen('settings')}><div className="profile-menu-left"><Settings size={20} /> Настройки</div><ChevronRight size={20} color="var(--text-secondary)" /></button>
          <button className="profile-menu-item" onClick={() => setActiveProfileScreen('support')}><div className="profile-menu-left"><LifeBuoy size={20} /> Поддержка</div><ChevronRight size={20} color="var(--text-secondary)" /></button>
        </div>
        <div className="profile-menu-group">
          <button className="profile-menu-item danger" onClick={() => { logout(); onLogout(); }}><div className="profile-menu-left"><LogOut size={20} /> Выйти из аккаунта</div></button>
        </div>
      </motion.div>
    );
  };

  // ==========================================
  // ЛОГИКА IOS-СВАЙПА "НАЗАД"
  // ==========================================
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const handleSwipeBack = () => {
    // Теперь эта функция прекрасно видит все стейты!
    if (deepScreen) {
      setDeepScreen(null);
    } else if (activeService) {
      setActiveService(null);
    } else if (activeProfileScreen) {
      setActiveProfileScreen(null);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch.clientX < 40) {
      setTouchStartX(touch.clientX);
      setTouchStartY(touch.clientY);
    } else {
      setTouchStartX(null);
      setTouchStartY(null);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    if (deltaX > 50 && Math.abs(deltaY) < deltaX) {
      handleSwipeBack();
    }

    setTouchStartX(null);
    setTouchStartY(null);
  };

  return (
    <motion.div className="app-container" variants={pageTransition} initial="initial" animate="in" exit="out" transition={{ duration: 0.4 }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
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
              { id: 'services', icon: Shield, label: 'Сервисы' },
              { id: 'wallet', icon: Wallet, label: 'Кошелек' },
              { id: 'profile', icon: User, label: 'Профиль' }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => { setActiveTab(tab.id as Tab); setShowNotifications(false); setShowVpnAddModal(false); if (tab.id !== 'services') setActiveService(null); if (tab.id !== 'profile') setActiveProfileScreen(null); }} className={`nav-item ${isActive ? 'active' : ''}`}>
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
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

// ==========================================
// 5. ОРКЕСТРАТОР APP VIEW
// ==========================================
export default function AppView() {
  const [appState, setAppState] = useState<'checking' | 'login' | 'maintenance' | 'app'>('checking');

  // Выносим проверку в отдельную функцию, чтобы вызывать ее и при старте, и после логина
  const checkAccess = async () => {
    try {
      setAppState('checking');
      
      // 1. Узнаем статус серверов
      const status = await client.system.getStatus();

      // 2. Достаем свежие данные юзера (особенно важно после логина!)
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      // 3. Главный блок безопасности
      if (status.maintenance && !user?.isAdmin) {
        setAppState('maintenance');
        return; // Стоп, дальше не пускаем
      }

      // 4. Если всё ок или юзер - админ
      if (user) {
        setAppState('app');
      } else {
        setAppState('login');
      }
    } catch (error) {
      console.error('Ошибка инициализации приложения:', error);
      // Чтобы ты сейчас мог тестить фронтенд (пока бэкенд выдает 404), 
      // я временно ставлю фолбэк на логин/приложение, а не на техработы.
      // Когда починишь бэкенд, можешь поменять обратно на 'maintenance'.
      const userStr = localStorage.getItem('user');
      setAppState(userStr ? 'app' : 'login'); 
    }
  };

  // Проверяем при первой загрузке страницы
  useEffect(() => {
    checkAccess();
  }, []);

  if (appState === 'checking') return null;

  

  return (
    <div className="app-wrapper">
      <AnimatePresence mode="wait">
        {/* Обрати внимание: теперь onLoginSuccess вызывает checkAccess() заново! */}
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