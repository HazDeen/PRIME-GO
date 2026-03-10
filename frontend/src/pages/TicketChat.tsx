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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadTicket(); }, [id]);
  useEffect(() => { scrollToBottom(); }, [ticket?.messages]);

  const loadTicket = async () => {
    try {
      const response = await fetch(`${API_URL}/tickets/${id}`);
      const data = await response.json();
      setTicket(data);
    } catch (error) {
      toast.error('Ошибка загрузки');
      navigate('/support');
    } finally { setLoading(false); }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;
    setSending(true);

    const tempMsg = { id: Date.now(), text: newMessage, isAdmin: false, createdAt: new Date().toISOString() };
    setTicket({ ...ticket, messages: [...ticket.messages, tempMsg] });
    setNewMessage('');

    try {
      await fetch(`${API_URL}/tickets/${id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: tempMsg.text, isAdmin: false }),
      });
      loadTicket();
    } catch (error) { toast.error('Ошибка сети'); } finally { setSending(false); }
  };

  if (loading) return <div className="container" style={{display:'flex', alignItems:'center', justifyContent:'center'}}><div className="toast-spinner"></div></div>;

  return (
    /* 🔥 КЛЮЧЕВОЙ ФИКС: Используем только твой класс контейнера и фиксируем высоту для мобилок через dvh */
    <div className="container" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: window.innerWidth < 768 ? '100dvh' : '85vh', 
      maxHeight: window.innerWidth < 768 ? 'none' : '850px',
      padding: '20px 16px',
      overflow: 'hidden' // Чтобы не было двойного скролла
    }}>
      
      {/* Header */}
      <div className="deviceDetailHeader" style={{ flexShrink: 0, marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
        <button className="backButton" onClick={() => navigate('/support')}><ChevronLeft size={24} /></button>
        <div>
          <h1 style={{ fontSize: '20px', margin: 0 }}>{ticket.topic}</h1>
          <span style={{ fontSize: '13px', color: ticket.status === 'CLOSED' ? 'var(--danger)' : 'var(--success)' }}>
            {ticket.status === 'CLOSED' ? 'Тикет закрыт' : 'Агент на связи'}
          </span>
        </div>
      </div>

      {/* Messages Area */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '10px' }}>
        <div style={{ textAlign: 'center', margin: '10px 0' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <Info size={12} /> Чат создан {new Date(ticket.createdAt).toLocaleDateString()}
          </div>
        </div>

        {ticket.messages.map((msg: any) => (
          <div key={msg.id} style={{ display: 'flex', flexDirection: !msg.isAdmin ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: '10px' }}>
            <div style={{ maxWidth: '80%', padding: '12px 16px', borderRadius: '20px', 
              background: !msg.isAdmin ? 'var(--text-primary)' : 'var(--bg-block)', 
              color: !msg.isAdmin ? 'var(--bg-primary)' : 'var(--text-primary)',
              border: !msg.isAdmin ? 'none' : '1px solid var(--border-color)',
              borderBottomRightRadius: !msg.isAdmin ? '4px' : '20px',
              borderBottomLeftRadius: !msg.isAdmin ? '20px' : '4px',
              fontSize: '14px', lineHeight: '1.4' }}>
              {msg.text}
              <div style={{ fontSize: '10px', marginTop: '4px', textAlign: 'right', opacity: 0.6 }}>
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ flexShrink: 0, paddingTop: '12px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input 
            className="modalInput" 
            type="text" 
            value={newMessage} 
            onChange={(e) => setNewMessage(e.target.value)}
            onFocus={() => setTimeout(scrollToBottom, 300)} // Фикс для клавиатуры
            placeholder="Введите сообщение..." 
            style={{ margin: 0, flex: 1, borderRadius: '24px' }} 
          />
          <button type="submit" className="themeButton" style={{ width: '48px', height: '48px', borderRadius: '50%', background: newMessage.trim() ? 'var(--text-primary)' : 'var(--bg-card)', color: newMessage.trim() ? 'var(--bg-primary)' : 'var(--text-secondary)', border: 'none' }}>
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}