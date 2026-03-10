import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ChevronLeft, Send, User, CheckCircle, Info, AlertTriangle } from 'lucide-react';

const API_URL = 'https://h4zdeen.up.railway.app';

export default function AdminTicketChat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  // 🔥 Состояние для нашего красивого окна подтверждения
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  
  const isDesktop = window.innerWidth >= 768;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadTicket(); }, [id]);
  useEffect(() => { setTimeout(scrollToBottom, 100); }, [ticket?.messages]);

  const loadTicket = async () => {
    try {
      const response = await fetch(`${API_URL}/tickets/${id}`);
      const data = await response.json();
      setTicket(data);
    } catch (error) {
      toast.error('Ошибка загрузки');
      navigate('/admin/tickets');
    } finally { setLoading(false); }
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;
    setSending(true);

    const tempMsg = { id: Date.now(), text: newMessage, isAdmin: true, createdAt: new Date().toISOString() };
    setTicket({ ...ticket, messages: [...ticket.messages, tempMsg] });
    setNewMessage('');
    scrollToBottom();

    try {
      await fetch(`${API_URL}/tickets/${id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: tempMsg.text, isAdmin: true }), 
      });
      loadTicket();
    } catch (error) { toast.error('Ошибка сети'); } finally { setSending(false); }
  };

  // 🔥 Новая функция для подтверждения закрытия (срабатывает из модалки)
  const confirmCloseTicket = async () => {
    setIsCloseModalOpen(false); // Прячем модалку
    toast.loading('Закрываем...', { id: 'close' });
    try {
      await fetch(`${API_URL}/tickets/${id}/close`, { method: 'PATCH' });
      toast.success('Тикет закрыт', { id: 'close' });
      loadTicket();
    } catch (error) {
      toast.error('Ошибка закрытия', { id: 'close' });
    }
  };

  if (loading) return <div className="container" style={{display:'flex', alignItems:'center', justifyContent:'center'}}><div className="toast-spinner"></div></div>;
  if (!ticket) return null;

  const isClosed = ticket.status === 'CLOSED';

  return (
    <div className="container" style={{ 
      display: 'flex', flexDirection: 'column', 
      height: isDesktop ? '85vh' : '100dvh', maxHeight: isDesktop ? '850px' : 'none',
      padding: '20px 16px', overflow: 'hidden', position: 'relative'
    }}>
      
      {/* Шапка */}
      <div className="deviceDetailHeader" style={{ flexShrink: 0, marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="backButton" onClick={() => navigate('/admin/tickets')}><ChevronLeft size={24} /></button>
          <div>
            <h1 style={{ fontSize: '18px', margin: 0 }}>Тикет #{ticket.id}</h1>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Пользователь: {ticket.userId}</span>
          </div>
        </div>
        
        {/* Кнопка открывает кастомную модалку */}
        {!isClosed && (
          <motion.button 
            onClick={() => setIsCloseModalOpen(true)}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '16px', background: 'var(--success-alpha)', color: 'var(--success)', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
          >
            <CheckCircle size={16} /> Закрыть
          </motion.button>
        )}
      </div>

      {/* Зона сообщений */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '10px', scrollbarWidth: 'none' }}>
        <div style={{ textAlign: 'center', margin: '10px 0' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <Info size={12} /> {ticket.topic}
          </div>
        </div>

        {ticket.messages.map((msg: any) => {
          const isMe = msg.isAdmin; 
          
          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '12px', background: isMe ? 'transparent' : 'var(--bg-card)', border: isMe ? 'none' : '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {isMe ? null : <User size={16} color="var(--text-secondary)" />}
              </div>

              <div style={{ 
                maxWidth: '80%', padding: '12px 16px', borderRadius: '20px', 
                background: isMe ? 'var(--text-primary)' : 'var(--bg-block)', 
                color: isMe ? 'var(--bg-primary)' : 'var(--text-primary)',
                border: isMe ? 'none' : '1px solid var(--border-color)',
                borderBottomRightRadius: isMe ? '4px' : '20px',
                borderBottomLeftRadius: isMe ? '20px' : '4px',
                fontSize: '14px', lineHeight: '1.4' 
              }}>
                {msg.text}
                <div style={{ fontSize: '10px', marginTop: '4px', textAlign: isMe ? 'right' : 'left', opacity: 0.6 }}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Поле ввода */}
      <div style={{ flexShrink: 0, paddingTop: '12px', paddingBottom: 'env(safe-area-inset-bottom, 0px)', borderTop: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
        {isClosed ? (
          <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-tertiary)', background: 'var(--bg-card)', borderRadius: '16px' }}>
            Тикет закрыт
          </div>
        ) : (
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input 
              className="modalInput" type="text" value={newMessage} 
              onChange={(e) => setNewMessage(e.target.value)}
              onFocus={() => setTimeout(scrollToBottom, 300)}
              placeholder="Ответить пользователю..." 
              style={{ margin: 0, flex: 1, borderRadius: '24px' }} 
            />
            <button type="submit" className="themeButton" style={{ width: '48px', height: '48px', borderRadius: '50%', background: newMessage.trim() ? 'var(--text-primary)' : 'var(--bg-card)', color: newMessage.trim() ? 'var(--bg-primary)' : 'var(--text-secondary)', border: 'none' }}>
              <Send size={20} />
            </button>
          </form>
        )}
      </div>

      {/* 🔥 КРАСИВОЕ ОКНО ПОДТВЕРЖДЕНИЯ ЗАКРЫТИЯ */}
      <AnimatePresence>
        {isCloseModalOpen && (
          /* .modalOverlay фиксирует всё окно */
          <div className="modalOverlay" style={{ alignItems: 'center', zIndex: 1000, pointerEvents: 'none' }}>
            
            <motion.div 
              className="modalBackdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCloseModalOpen(false)}
              style={{ pointerEvents: 'auto', backdropFilter: 'blur(30px)' }} // 👈 Сильный блюр за модалкой
            />
            
            <motion.div 
              className="modalSheet" // 👈 Твой класс из app.css
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              style={{
                pointerEvents: 'auto',
                maxWidth: '340px',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                boxShadow: 'var(--shadow)', // 👈 Твоя тень
                border: '1px solid var(--border-color)', // 👈 Твоя рамка
                position: 'relative',
                zIndex: 1002 // 👈 Ключевой стиль stacking order (над z-1001)
              }}
            >
              <div style={{ 
                width: '64px', height: '64px', borderRadius: '20px', 
                background: 'var(--warning-alpha)', color: 'var(--warning)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                marginBottom: '20px' 
              }}>
                <AlertTriangle size={32} />
              </div>
              
              <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 10px 0', color: 'var(--text-primary)' }}>
                Закрыть тикет?
              </h3>
              
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 28px 0', lineHeight: 1.5 }}>
                Вы уверены, что вопрос решен? Пользователь больше не сможет отправлять сюда сообщения.
                <br/><br/>
                ID Пользователя: <strong style={{ color: 'var(--text-primary)', fontWeight: 700, letterSpacing: '0.5px' }}>{ticket.userId}</strong>
              </p>
              
              <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                <button 
                  onClick={() => setIsCloseModalOpen(false)}
                  style={{ 
                    flex: 1, padding: '16px', borderRadius: '16px', 
                    background: 'var(--bg-card)', border: '1px solid var(--border-input)', 
                    color: 'var(--text-secondary)', fontSize: '15px', fontWeight: 600, cursor: 'pointer' 
                  }}
                >
                  Отмена
                </button>
                <button 
                  onClick={confirmCloseTicket}
                  style={{ 
                    flex: 1, padding: '16px', borderRadius: '16px', 
                    background: 'var(--success)', border: 'none', 
                    color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
                    boxShadow: '0 4px 12px var(--success-alpha)' // 👈 Твой CSS переменная
                  }}
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}