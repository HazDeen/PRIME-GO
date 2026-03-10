import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { 
  ChevronLeft, Plus, MessageCircle, Clock, 
  CheckCircle2, ChevronRight, ChevronDown, Headset,
  CreditCard, Globe, Bug, Lightbulb // 👈 Добавили новые иконки для списка
} from 'lucide-react';

// 👇 Не забудь поменять на свой актуальный URL бэкенда
const API_URL = 'https://h4zdeen.up.railway.app';

// Массив наших тем с нормальными иконками
const TOPICS = [
  { id: 'payment', label: 'Вопрос по оплате', icon: <CreditCard size={18} /> },
  { id: 'vpn', label: 'Не работает VPN', icon: <Globe size={18} /> },
  { id: 'bug', label: 'Ошибка в приложении', icon: <Bug size={18} /> },
  { id: 'idea', label: 'Предложение / Идея', icon: <Lightbulb size={18} /> },
  { id: 'other', label: 'Другое', icon: <MessageCircle size={18} /> },
];

export default function Support() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Состояния для нового тикета
  const [topic, setTopic] = useState(TOPICS[0].label);
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // 👈 Управление нашим кастомным списком

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return navigate('/');
      const user = JSON.parse(userStr);

      const response = await fetch(`${API_URL}/tickets/user/${user.telegramId}`);
      if (!response.ok) throw new Error('Ошибка загрузки');
      
      const data = await response.json();
      setTickets(data);
    } catch (error) {
      toast.error('Не удалось загрузить тикеты');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return toast.error('Опишите вашу проблему');

    setIsSubmitting(true);
    toast.loading('Создаем обращение...', { id: 'create-ticket' });

    try {
      const userStr = localStorage.getItem('user');
      const user = JSON.parse(userStr!);

      const response = await fetch(`${API_URL}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.telegramId, topic, text }),
      });

      if (!response.ok) throw new Error('Ошибка сервера');

      toast.success('Обращение создано!', { id: 'create-ticket' });
      setIsModalOpen(false);
      setText('');
      loadTickets();
    } catch (error) {
      toast.error('Не удалось создать обращение', { id: 'create-ticket' });
    } finally {
      setIsSubmitting(false);
    }
  };

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

  // Находим текущий выбранный объект темы, чтобы достать его иконку
  const currentTopic = TOPICS.find(t => t.label === topic) || TOPICS[0];

  return (
    <div className="deviceDetailPage container">
      {/* Шапка */}
      <div className="deviceDetailHeader">
        <motion.button 
          className="backButton" 
          onClick={() => navigate('/')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronLeft size={24} />
        </motion.button>
        <h1>Поддержка</h1>
      </div>

      {/* Информационный блок */}
      <div className="infoMessage">
        <Headset className="infoIcon" size={20} />
        <div>
          Служба поддержки работает с 10:00 до 22:00. Мы стараемся отвечать на все вопросы в течение 15 минут.
        </div>
      </div>

      {/* Блок со списком тикетов */}
      <div className="devicesCardHeader" style={{ marginTop: '32px' }}>
        <div className="devicesCardTitle">
          <h2 className="sectionTitle">Мои обращения</h2>
          {!loading && <span className="devicesCount">{tickets.length}</span>}
        </div>
        <motion.button 
          className="addButton" 
          onClick={() => setIsModalOpen(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus size={18} /> Новое
        </motion.button>
      </div>

      {/* Список */}
      <div className="ticketsList">
        {loading ? (
          <div className="loadingScreen" style={{ minHeight: '200px' }}>
            <div className="toast-spinner" style={{ width: '32px', height: '32px', border: '3px solid var(--border-color)', borderTopColor: 'var(--text-primary)', borderRadius: '50%' }}></div>
          </div>
        ) : tickets.length === 0 ? (
          <motion.div 
            className="deleteCard" 
            style={{ justifyContent: 'center', background: 'var(--bg-card)', borderColor: 'var(--border-color)', flexDirection: 'column', gap: '8px', padding: '32px' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <MessageCircle size={48} style={{ color: 'var(--text-tertiary)', marginBottom: '8px' }} />
            <div className="deleteCardContent" style={{ textAlign: 'center' }}>
              <h4 style={{ color: 'var(--text-primary)' }}>У вас нет обращений</h4>
              <p>Если у вас возникли трудности, создайте новый тикет.</p>
            </div>
          </motion.div>
        ) : (
          tickets.map((ticket, index) => (
            <motion.div 
              key={ticket.id}
              className="deviceCard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => navigate(`/support/${ticket.id}`)}
            >
              <div className="deviceIcon" style={{ background: 'var(--bg-input)' }}>
                <MessageCircle size={24} />
              </div>
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

      {/* Модальное окно создания тикета (Шторка) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="modalOverlay">
            <motion.div 
              className="modalBackdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              className="modalSheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              <div className="modalHandle" onClick={() => setIsModalOpen(false)} />
              <h2 className="modalTitle">Новое обращение</h2>
              
              <div className="modalDescription">
                <p className="modalNote">Опишите вашу проблему максимально подробно, чтобы мы могли помочь вам быстрее.</p>
              </div>

              <form onSubmit={handleCreateTicket}>
                <div className="modalField" style={{ position: 'relative', zIndex: 50 }}>
                  <label className="modalLabel">Тема обращения</label>
                  
                  {/* 🔥 КАСТОМНЫЙ DROPDOWN ВМЕСТО SELECT 🔥 */}
                  <div style={{ position: 'relative', marginBottom: '16px' }}>
                    {/* Кнопка открытия (выглядит как инпут) */}
                    <div 
                      className="modalInput"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      style={{ 
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        cursor: 'pointer', margin: 0, userSelect: 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ color: 'var(--text-secondary)', display: 'flex' }}>
                          {currentTopic.icon}
                        </span>
                        <span>{currentTopic.label}</span>
                      </div>
                      <ChevronDown 
                        size={20} 
                        style={{ 
                          color: 'var(--text-secondary)',
                          transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0)',
                          transition: 'transform 0.3s ease'
                        }} 
                      />
                    </div>

                    {/* Выпадающее меню */}
                    <AnimatePresence>
                      {isDropdownOpen && (
                        <>
                          {/* Невидимый слой, чтобы закрывать меню по клику снаружи */}
                          <div 
                            style={{ position: 'fixed', inset: 0, zIndex: 10 }} 
                            onClick={() => setIsDropdownOpen(false)}
                          />
                          <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            style={{
                              position: 'absolute', top: '100%', left: 0, right: 0,
                              marginTop: '8px', padding: '8px',
                              background: 'rgb(20 20 20)',
                              backdropFilter: 'blur(24px)',
                              WebkitBackdropFilter: 'blur(24px)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '20px',
                              boxShadow: 'var(--shadow)',
                              zIndex: 20
                            }}
                          >
                            {TOPICS.map((t) => (
                              <div
                                key={t.id}
                                onClick={() => {
                                  setTopic(t.label);
                                  setIsDropdownOpen(false);
                                }}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '12px',
                                  padding: '14px 16px', borderRadius: '14px',
                                  cursor: 'pointer', transition: 'all 0.2s',
                                  background: topic === t.label ? 'var(--bg-hover)' : 'transparent',
                                  color: topic === t.label ? 'var(--text-primary)' : 'var(--text-secondary)',
                                  fontWeight: topic === t.label ? 600 : 500
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = topic === t.label ? 'var(--bg-hover)' : 'transparent'}
                              >
                                <span style={{ color: topic === t.label ? 'var(--text-primary)' : 'var(--text-tertiary)', display: 'flex' }}>
                                  {t.icon}
                                </span>
                                {t.label}
                                {topic === t.label && (
                                  <CheckCircle2 size={16} style={{ marginLeft: 'auto', color: 'var(--success)' }} />
                                )}
                              </div>
                            ))}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="modalField" style={{ position: 'relative', zIndex: 1 }}>
                  <label className="modalLabel">Описание проблемы</label>
                  <textarea 
                    className="modalInput"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Например: Я оплатил подписку 10 минут назад, но устройство не активировалось..."
                    rows={4}
                    style={{ resize: 'none', marginBottom: '8px' }}
                  />
                </div>

                <div className="modalActionsRow" style={{ position: 'relative', zIndex: 1 }}>
                  <button 
                    type="button" 
                    className="modalCancelBtn"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Отмена
                  </button>
                  <button 
                    type="submit" 
                    className="modalSubmitBtn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Отправка...' : 'Создать'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}