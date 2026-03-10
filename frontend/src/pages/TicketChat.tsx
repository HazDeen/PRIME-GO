import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronLeft, Send, Info } from 'lucide-react';

const API_URL = 'https://h4zdeen.up.railway.app';

export default function TicketChat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  // 👈 Сохраняем количество сообщений для умного скролла
  const [msgCount, setMsgCount] = useState(0); 
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { 
    loadTicket(true); 
    
    // 🔥 АВТООБНОВЛЕНИЕ (Polling) каждые 3 секунды 🔥
    const interval = setInterval(() => loadTicket(false), 3000);
    return () => clearInterval(interval);
  }, [id]);

  // Скроллим вниз ТОЛЬКО если добавилось новое сообщение (чтобы не дергать экран просто так)
  useEffect(() => { 
    if (msgCount > 0) scrollToBottom(); 
  }, [msgCount]);

  // showLoading = false по умолчанию, чтобы крутилка не мигала каждые 3 сек
  const loadTicket = async (showLoading = false) => {
    try {
      const response = await fetch(`${API_URL}/tickets/${id}`);
      const data = await response.json();
      setTicket(data);
      setMsgCount(data.messages?.length || 0);
    } catch (error) {
      if (showLoading) {
        toast.error('Ошибка загрузки');
        navigate('/support');
      }
    } finally { 
      if (showLoading) setLoading(false); 
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    // Защита на фронте, если тикет уже закрыт
    if (ticket?.status === 'CLOSED') {
      toast.error('Тикет уже закрыт, отправка невозможна');
      return;
    }

    setSending(true);

    const tempMsg = { id: Date.now(), text: newMessage, isAdmin: false, createdAt: new Date().toISOString() };
    setTicket({ ...ticket, messages: [...ticket.messages, tempMsg] });
    setNewMessage('');

    try {
      const response = await fetch(`${API_URL}/tickets/${id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: tempMsg.text, isAdmin: false }),
      });
      
      if (!response.ok) throw new Error('Ошибка сервера');
      
      loadTicket(false);
    } catch (error) { 
      toast.error('Не удалось отправить. Возможно, тикет закрыт.'); 
      loadTicket(false); // Откатываем UI назад, если сервер не принял
    } finally { 
      setSending(false); 
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
          <button className="backButton" onClick={() => navigate('/support')}>
            <ChevronLeft size={24} />
          </button>
          <div className="chatTitleInfo">
            <h1 className="chatTitle">{ticket.topic}</h1>
            <span className={`chatStatus ${isClosed ? 'closed' : 'open'}`}>
              {isClosed ? 'Тикет закрыт' : 'Агент на связи'}
            </span>
          </div>
        </div>
      </div>

      <div className="chatMessagesArea">
        <div className="chatSystemMessage">
          <div className="chatSystemMessageInner">
            <Info size={12} /> Чат создан {new Date(ticket.createdAt).toLocaleDateString()}
          </div>
        </div>

        {ticket.messages.map((msg: any) => {
          const isUser = !msg.isAdmin;
          return (
            <div key={msg.id} className={`chatMessageWrapper ${isUser ? 'reverse' : ''}`}>
              <div className={`chatBubble ${isUser ? 'userStyle' : 'adminStyle'}`}>
                {msg.text}
                <div className={`chatTime ${isUser ? 'right' : 'left'}`}>
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
            Вопрос решен. Чат закрыт.
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="chatInputForm">
            <input 
              className="modalInput chatInputField" 
              type="text" 
              value={newMessage} 
              onChange={(e) => setNewMessage(e.target.value)}
              onFocus={() => setTimeout(scrollToBottom, 300)}
              placeholder="Введите сообщение..." 
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

    </div>
  );
}