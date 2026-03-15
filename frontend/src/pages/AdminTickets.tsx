import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ChevronLeft, Filter, Search, Clock, MessageCircle, CheckCircle2, ChevronRight, User, ChevronDown, Check } from 'lucide-react';

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
        return <div className="daysBadge" style={{ background: 'var(--warning-alpha)', color: 'var(--warning)', flexShrink: 0 }}><Clock size={14} /> Новый</div>;
      case 'ANSWERED': 
        return <div className="daysBadge" style={{ background: 'var(--accent-alpha)', color: 'var(--accent)', flexShrink: 0 }}><MessageCircle size={14} /> Отвечен</div>;
      case 'CLOSED': 
        return <div className="daysBadge" style={{ background: 'var(--success-alpha)', color: 'var(--success)', flexShrink: 0 }}><CheckCircle2 size={14} /> Закрыт</div>;
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
          <div className="customFilterDropdown" style={{ zIndex: isStatusOpen ? 50 : 1 }}>
            <div 
              className={`modalInput customFilterTrigger ${isStatusOpen ? 'open' : ''}`}
              onClick={() => { setIsStatusOpen(!isStatusOpen); setIsTopicOpen(false); }}
            >
              <span>{filterStatus.label}</span>
              <ChevronDown size={18} />
            </div>
            
            <AnimatePresence>
              {isStatusOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: -1 }} onClick={() => setIsStatusOpen(false)} />
                  <motion.div
                    className="no-scrollbar customFilterList"
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -10 }} 
                    transition={{ duration: 0.15, ease: "easeOut" }}
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <div
                        key={opt.value}
                        onClick={() => { setFilterStatus(opt); setIsStatusOpen(false); }}
                        className={`customFilterItem ${filterStatus.value === opt.value ? 'active' : ''}`}
                      >
                        {opt.label}
                        {filterStatus.value === opt.value && <Check size={16} color="var(--text-primary)" />}
                      </div>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Dropdown: ТЕМА */}
          <div className="customFilterDropdown" style={{ zIndex: isTopicOpen ? 50 : 1 }}>
            <div 
              className={`modalInput customFilterTrigger ${isTopicOpen ? 'open' : ''}`}
              onClick={() => { setIsTopicOpen(!isTopicOpen); setIsStatusOpen(false); }}
            >
              <span>{filterTopic.label}</span>
              <ChevronDown size={18} />
            </div>
            
            <AnimatePresence>
              {isTopicOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: -1 }} onClick={() => setIsTopicOpen(false)} />
                  <motion.div
                    className="no-scrollbar customFilterList"
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -10 }} 
                    transition={{ duration: 0.15, ease: "easeOut" }}
                  >
                    {TOPIC_OPTIONS.map(opt => (
                      <div
                        key={opt.value}
                        onClick={() => { setFilterTopic(opt); setIsTopicOpen(false); }}
                        className={`customFilterItem ${filterTopic.value === opt.value ? 'active' : ''}`}
                      >
                        {opt.label}
                        {filterTopic.value === opt.value && <Check size={16} color="var(--text-primary)" />}
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
              {/* ФИКС: Добавляем minWidth: 0, чтобы блок мог безопасно сжиматься */}
              <div className="deviceInfo" style={{ minWidth: 0 }}>
                
                <div className="deviceNameWrapper" style={{ alignItems: 'baseline', minWidth: 0, flexWrap: 'nowrap' }}>
                  {/* ФИКС: Обрезаем длинный никнейм многоточием */}
                  <span className="deviceName" style={{ fontSize: '16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1 }}>
                    {ticket.username}
                  </span>
                  
                  {/* ID пользователя не обрезаем, оставляем видимым */}
                  <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontWeight: 500, flexShrink: 0 }}>
                    {ticket.userId}
                  </span>
                </div>
                
                {/* ФИКС: Тему тоже обрезаем, если юзер написал целое сочинение */}
                <div className="deviceDate" style={{ color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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