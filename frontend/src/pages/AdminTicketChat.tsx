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
  const [msgCount, setMsgCount] = useState(0); // 👈 Счетчик для скролла
  
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { 
    loadTicket(true); 
    // 🔥 Автообновление каждые 3 секунды, чтобы видеть ответы юзера 🔥
    const interval = setInterval(() => loadTicket(false), 3000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => { 
    if (msgCount > 0) scrollToBottom(); 
  }, [msgCount]);

  const loadTicket = async (showLoading = false) => {
    try {
      const response = await fetch(`${API_URL}/tickets/${id}`);
      const data = await response.json();
      setTicket(data);
      setMsgCount(data.messages?.length || 0);
    } catch (error) {
      if (showLoading) {
        toast.error('Ошибка загрузки');
        navigate('/admin/tickets');
      }
    } finally { 
      if (showLoading) setLoading(false); 
    }
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;
    setSending(true);

    const tempMsg = { id: Date.now(), text: newMessage, isAdmin: true, createdAt: new Date().toISOString() };
    setTicket({ ...ticket, messages: [...ticket.messages, tempMsg] });
    setNewMessage('');

    try {
      await fetch(`${API_URL}/tickets/${id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: tempMsg.text, isAdmin: true }), 
      });
      loadTicket(false);
    } catch (error) { toast.error('Ошибка сети'); loadTicket(false); } finally { setSending(false); }
  };

  const confirmCloseTicket = async () => {
    setIsCloseModalOpen(false);
    toast.loading('Закрываем...', { id: 'close' });
    try {
      await fetch(`${API_URL}/tickets/${id}/close`, { method: 'PATCH' });
      toast.success('Тикет закрыт', { id: 'close' });
      loadTicket(false); // Сразу обновляем стейт
    } catch (error) {
      toast.error('Ошибка закрытия', { id: 'close' });
    }
  };

  if (loading) {
    return (
      <div className="container supportLoadingScreen">
        <div className="toast-spinner" style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--text-primary)', borderRadius: '50%' }}></div>
      </div>
    );
  }

  if (!ticket) return null;
  const isClosed = ticket.status === 'CLOSED';

  return (
    <div className="container chatContainer">
      
      <div className="chatHeader">
        <div className="chatHeaderLeft">
          <button className="backButton" onClick={() => navigate('/admin/tickets')}>
            <ChevronLeft size={24} />
          </button>
          <div className="chatTitleInfo">
            <h1 className="chatTitle" style={{ fontSize: '18px' }}>Тикет #{ticket.id}</h1>
            <span className="chatStatus" style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
              Пользователь: {ticket.userId}
            </span>
          </div>
        </div>
        
        {!isClosed && (
          <motion.button 
            onClick={() => setIsCloseModalOpen(true)}
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }}
            className="adminCloseTicketBtn"
          >
            <CheckCircle size={16} /> Закрыть
          </motion.button>
        )}
      </div>

      <div className="chatMessagesArea">
        <div className="chatSystemMessage">
          <div className="chatSystemMessageInner">
            <Info size={12} /> {ticket.topic}
          </div>
        </div>

        {ticket.messages.map((msg: any) => {
          const isMe = msg.isAdmin; 
          
          return (
            <div key={msg.id} className={`chatMessageWrapper ${isMe ? 'reverse' : ''}`}>
              <div className={`chatAvatar ${isMe ? '' : 'admin'}`}>
                {isMe ? null : <User size={16} color="var(--text-secondary)" />}
              </div>

              <div className={`chatBubble ${isMe ? 'userStyle' : 'adminStyle'}`}>
                {msg.text}
                <div className={`chatTime ${isMe ? 'right' : 'left'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="chatInputArea">
        {isClosed ? (
          <div className="chatClosedMessage">
            Тикет закрыт
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="chatInputForm">
            <input 
              className="modalInput chatInputField" 
              type="text" 
              value={newMessage} 
              onChange={(e) => setNewMessage(e.target.value)}
              onFocus={() => setTimeout(scrollToBottom, 300)}
              placeholder="Ответить пользователю..." 
            />
            <button 
              type="submit" 
              className={`chatSendBtn ${newMessage.trim() ? 'active' : 'disabled'}`}
              disabled={!newMessage.trim() || sending}
            >
              <Send size={20} />
            </button>
          </form>
        )}
      </div>

      <AnimatePresence>
        {isCloseModalOpen && (
          <div className="modalOverlay adminConfirmModalOverlay">
            <motion.div 
              className="modalBackdrop adminConfirmBackdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCloseModalOpen(false)}
            />
            
            <motion.div 
              className="modalSheet adminConfirmCard"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="adminConfirmIconBox">
                <AlertTriangle size={32} />
              </div>
              
              <h3 className="adminConfirmTitle">
                Закрыть тикет?
              </h3>
              
              <p className="adminConfirmText">
                Вы уверены, что вопрос решен? Пользователь больше не сможет отправлять сюда сообщения.
                <br/><br/>
                ID Пользователя: <strong style={{ color: 'var(--text-primary)', fontWeight: 700, letterSpacing: '0.5px' }}>{ticket.userId}</strong>
              </p>
              
              <div className="adminConfirmActions">
                <button className="adminConfirmCancel" onClick={() => setIsCloseModalOpen(false)}>
                  Отмена
                </button>
                <button className="adminConfirmSubmit" onClick={confirmCloseTicket}>
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