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
    <div className="adminTicketsContainer">
      
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
      <div className="adminFiltersPanel">
        <div className="adminFiltersTitle">
          <Filter size={18} /> Фильтры
        </div>
        
        {/* Поиск */}
        <form onSubmit={handleSearch} className="adminSearchForm">
          <div className="adminSearchWrapper">
            <Search size={18} className="adminSearchIcon" />
            <input 
              type="text" 
              className="modalInput adminSearchField" 
              placeholder="Поиск по User ID..."
              value={searchUserId}
              onChange={(e) => setSearchUserId(e.target.value)}
            />
          </div>
          <button type="submit" className="adminSearchBtn">
            <Search size={20} />
          </button>
        </form>

        {/* Кастомные выпадающие списки (Dropdowns) */}
        <div className="adminDropdownsRow">
          
          {/* Dropdown: СТАТУС */}
          <div className="adminDropdownWrapper">
            <div 
              className="modalInput adminDropdownTrigger"
              onClick={() => { setIsStatusOpen(!isStatusOpen); setIsTopicOpen(false); }}
            >
              <span>{filterStatus.label}</span>
              <ChevronDown 
                size={18} 
                style={{ color: 'var(--text-secondary)', transform: isStatusOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} 
              />
            </div>
            <AnimatePresence>
              {isStatusOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 20 }} onClick={() => setIsStatusOpen(false)} />
                  <motion.div
                    className="adminDropdownList"
                    initial={{ opacity: 0, y: -5, scale: 0.95 }} 
                    animate={{ opacity: 1, y: 0, scale: 1 }} 
                    exit={{ opacity: 0, y: -5, scale: 0.95 }} 
                    transition={{ duration: 0.15 }}
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <div
                        key={opt.value}
                        onClick={() => { setFilterStatus(opt); setIsStatusOpen(false); }}
                        className={`adminDropdownItem ${filterStatus.value === opt.value ? 'active' : ''}`}
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
          <div className="adminDropdownWrapper">
            <div 
              className="modalInput adminDropdownTrigger"
              onClick={() => { setIsTopicOpen(!isTopicOpen); setIsStatusOpen(false); }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{filterTopic.label}</span>
              <ChevronDown 
                size={18} 
                style={{ color: 'var(--text-secondary)', transform: isTopicOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} 
              />
            </div>
            <AnimatePresence>
              {isTopicOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 20 }} onClick={() => setIsTopicOpen(false)} />
                  <motion.div
                    className="adminDropdownList"
                    initial={{ opacity: 0, y: -5, scale: 0.95 }} 
                    animate={{ opacity: 1, y: 0, scale: 1 }} 
                    exit={{ opacity: 0, y: -5, scale: 0.95 }} 
                    transition={{ duration: 0.15 }}
                  >
                    {TOPIC_OPTIONS.map(opt => (
                      <div
                        key={opt.value}
                        onClick={() => { setFilterTopic(opt); setIsTopicOpen(false); }}
                        className={`adminDropdownItem ${filterTopic.value === opt.value ? 'active' : ''}`}
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
      <div className="adminTicketsList">
        {loading ? (
          <div className="supportLoadingScreen">
            <div className="toast-spinner" style={{ width: '32px', height: '32px', border: '3px solid var(--border-color)', borderTopColor: 'var(--text-primary)', borderRadius: '50%' }}></div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="supportEmptyState" style={{ background: 'transparent', border: 'none' }}>
            <span style={{ color: 'var(--text-tertiary)' }}>Тикеты не найдены</span>
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
                <div className="deviceNameWrapper" style={{ alignItems: 'baseline' }}>
                  {/* 🔥 Выводим никнейм основным текстом */}
                  <span className="deviceName" style={{ fontSize: '16px' }}>
                    {ticket.username}
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                    {ticket.userId}
                  </span>
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