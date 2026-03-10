import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ChevronLeft, Filter, Search, Clock, MessageCircle, CheckCircle2, ChevronRight, User, ChevronDown } from 'lucide-react';

const API_URL = 'https://h4zdeen.up.railway.app';

const STATUS_OPTIONS = [
  { value: '', label: 'Все статусы' },
  { value: 'OPEN', label: 'Новые (OPEN)' },
  { value: 'ANSWERED', label: 'Отвеченные' },
  { value: 'CLOSED', label: 'Закрытые' },
];

const TOPIC_OPTIONS = [
  { value: '', label: 'Все темы' },
  { value: 'Вопрос по оплате', label: 'Оплата' },
  { value: 'Не работает VPN', label: 'Связь' },
  { value: 'Ошибка в приложении', label: 'Баги' },
  { value: 'Предложение / Идея', label: 'Идеи' },
  { value: 'Другое', label: 'Другое' },
];

export default function AdminTickets() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const isDesktop = window.innerWidth >= 768;

  // Фильтры
  const [filterStatus, setFilterStatus] = useState(STATUS_OPTIONS[0]);
  const [filterTopic, setFilterTopic] = useState(TOPIC_OPTIONS[0]);
  const [searchUserId, setSearchUserId] = useState('');

  // Состояния для кастомных dropdown'ов
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isTopicOpen, setIsTopicOpen] = useState(false);

  useEffect(() => {
    loadAdminTickets();
  }, [filterStatus.value, filterTopic.value]); // Перезагружаем при смене фильтров

  const loadAdminTickets = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filterStatus.value) query.append('status', filterStatus.value);
      if (filterTopic.value) query.append('topic', filterTopic.value);
      if (searchUserId) query.append('userId', searchUserId);

      const response = await fetch(`${API_URL}/tickets/admin/all?${query.toString()}`);
      if (!response.ok) throw new Error('Ошибка загрузки');
      
      const data = await response.json();
      setTickets(data);
    } catch (error) {
      toast.error('Не удалось загрузить тикеты');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadAdminTickets();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN': 
        return <div className="daysBadge" style={{ background: 'var(--warning-alpha)', color: 'var(--warning)' }}><Clock size={14} /> Новый</div>;
      case 'ANSWERED': 
        return <div className="daysBadge" style={{ background: 'var(--accent-alpha)', color: 'var(--accent)' }}><MessageCircle size={14} /> Отвечен</div>;
      case 'CLOSED': 
        return <div className="daysBadge" style={{ background: 'var(--success-alpha)', color: 'var(--success)' }}><CheckCircle2 size={14} /> Закрыт</div>;
      default: return null;
    }
  };

  return (
    <div className="container" style={{ 
      display: 'flex', flexDirection: 'column', 
      height: isDesktop ? '85vh' : '100dvh', maxHeight: isDesktop ? '850px' : 'none', 
      padding: '20px 16px', overflow: 'hidden' 
    }}>
      
      {/* Шапка */}
      <div className="deviceDetailHeader" style={{ flexShrink: 0 }}>
        <motion.button 
          className="backButton" 
          onClick={() => navigate('/admin')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronLeft size={24} />
        </motion.button>
        <h1>Тикеты</h1>
      </div>

      {/* Панель фильтров */}
      <div style={{ background: 'var(--bg-block)', padding: '16px', borderRadius: '24px', marginBottom: '16px', border: '1px solid var(--border-color)', flexShrink: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
          <Filter size={18} /> Фильтры
        </div>
        
        {/* Поиск */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-tertiary)' }} />
            <input 
              type="text" 
              className="modalInput" 
              placeholder="Поиск по User ID..."
              value={searchUserId}
              onChange={(e) => setSearchUserId(e.target.value)}
              style={{ margin: 0, paddingLeft: '40px', borderRadius: '16px', width: '100%' }}
            />
          </div>
          <button type="submit" className="themeButton" style={{ width: '48px', height: '48px', borderRadius: '16px', border: 'none', background: 'var(--text-primary)', color: 'var(--bg-primary)' }}>
            <Search size={20} />
          </button>
        </form>

        {/* Кастомные выпадающие списки (Dropdowns) */}
        <div style={{ display: 'flex', gap: '10px' }}>
          
          {/* Dropdown: СТАТУС */}
          <div style={{ position: 'relative', flex: 1 }}>
            <div 
              className="modalInput"
              onClick={() => { setIsStatusOpen(!isStatusOpen); setIsTopicOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: 0, borderRadius: '16px', padding: '12px 14px', cursor: 'pointer', fontSize: '14px', userSelect: 'none' }}
            >
              <span>{filterStatus.label}</span>
              <ChevronDown size={18} style={{ color: 'var(--text-secondary)', transform: isStatusOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
            </div>
            <AnimatePresence>
              {isStatusOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 20 }} onClick={() => setIsStatusOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -5, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: 0.95 }} transition={{ duration: 0.15 }}
                    style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px', padding: '8px', background: 'var(--bg-block)', backdropFilter: 'blur(24px)', border: '1px solid var(--border-color)', borderRadius: '16px', boxShadow: 'var(--shadow)', zIndex: 30 }}
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <div
                        key={opt.value}
                        onClick={() => { setFilterStatus(opt); setIsStatusOpen(false); }}
                        style={{ padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', background: filterStatus.value === opt.value ? 'var(--bg-hover)' : 'transparent', color: filterStatus.value === opt.value ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                      >
                        {opt.label}
                      </div>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Dropdown: ТЕМА */}
          <div style={{ position: 'relative', flex: 1 }}>
            <div 
              className="modalInput"
              onClick={() => { setIsTopicOpen(!isTopicOpen); setIsStatusOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: 0, borderRadius: '16px', padding: '12px 14px', cursor: 'pointer', fontSize: '14px', userSelect: 'none' }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{filterTopic.label}</span>
              <ChevronDown size={18} style={{ color: 'var(--text-secondary)', transform: isTopicOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
            </div>
            <AnimatePresence>
              {isTopicOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 20 }} onClick={() => setIsTopicOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -5, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: 0.95 }} transition={{ duration: 0.15 }}
                    style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px', padding: '8px', background: 'var(--bg-block)', backdropFilter: 'blur(24px)', border: '1px solid var(--border-color)', borderRadius: '16px', boxShadow: 'var(--shadow)', zIndex: 30 }}
                  >
                    {TOPIC_OPTIONS.map(opt => (
                      <div
                        key={opt.value}
                        onClick={() => { setFilterTopic(opt); setIsTopicOpen(false); }}
                        style={{ padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', background: filterTopic.value === opt.value ? 'var(--bg-hover)' : 'transparent', color: filterTopic.value === opt.value ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                      >
                        {opt.label}
                      </div>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>

      {/* Список тикетов */}
      <div className="ticketsList" style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', paddingBottom: '20px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <div className="toast-spinner" style={{ width: '32px', height: '32px', border: '3px solid var(--border-color)', borderTopColor: 'var(--text-primary)', borderRadius: '50%' }}></div>
          </div>
        ) : tickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
            Тикеты не найдены
          </div>
        ) : (
          tickets.map((ticket, index) => (
            <motion.div 
              key={ticket.id}
              className="deviceCard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => navigate(`/admin/tickets/${ticket.id}`)}
              style={{ marginBottom: '8px' }}
            >
              <div className="deviceIcon" style={{ background: 'var(--bg-input)' }}>
                <User size={24} color="var(--text-secondary)" />
              </div>
              <div className="deviceInfo">
                <div className="deviceNameWrapper">
                  <span className="deviceName" style={{ fontSize: '15px' }}>ID: {ticket.userId}</span>
                </div>
                <div className="deviceDate" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                  {ticket.topic}
                </div>
                <div className="deviceDate" style={{ fontSize: '11px', marginTop: '4px' }}>
                  {new Date(ticket.createdAt).toLocaleDateString()}
                </div>
              </div>
              {getStatusBadge(ticket.status)}
              <ChevronRight className="deviceChevron" size={20} />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}