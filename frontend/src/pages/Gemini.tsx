import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Sparkles, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import BalanceCard from "../components/BalanceCard";
import ActionButtons from "../components/ActionButtons";

const API_URL = 'https://h4zdeen.up.railway.app';

export default function Gemini() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const handleRequestAccess = async () => {
    if (!user) {
      toast.error('Пользователь не найден. Перезайдите в приложение.');
      return;
    }

    setLoading(true);
    try {
      // Автоматически создаем тикет с нужной темой
      const response = await fetch(`${API_URL}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.telegramId?.toString() || user.id?.toString(),
          topic: 'Доступ к Gemini AI', // Фиксированная тема
          text: 'Здравствуйте! Я хочу получить доступ к сервису Gemini AI. Спишите средства с моего баланса и выдайте доступы, пожалуйста.'
        }),
      });

      if (!response.ok) throw new Error('Ошибка создания заявки');
      
      const newTicket = await response.json();
      
      toast.success('Заявка успешно создана!', { icon: '✨' });
      
      // Перекидываем пользователя прямо в созданный чат с админом
      setTimeout(() => {
        navigate(`/support/${newTicket.id}`);
      }, 1500);

    } catch (error: any) {
      toast.error(error.message || 'Не удалось отправить заявку');
      setLoading(false);
    }
  };

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 }
  };

  return (
    <motion.div 
      className="container"
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Шапка */}
      <div className="homeHeader" style={{ justifyContent: 'flex-start', gap: '16px', marginBottom: '20px' }}>
        <motion.button 
          className="themeButton" 
          onClick={() => navigate('/home')} 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronLeft size={24} />
        </motion.button>
        <h1 className="screenTitle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={24} color="var(--accent)" /> Gemini AI
        </h1>
      </div>

      {/* Карточка баланса (такая же как в VPN) */}
      <BalanceCard />
      <ActionButtons />

      {/* Информационная карточка */}
      <div className="customCard" style={{ marginTop: '20px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div className="deviceIcon" style={{ background: 'var(--accent-alpha)', color: 'var(--accent)' }}>
            <Sparkles size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Умный помощник</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, marginTop: '4px' }}>
              Нейросеть нового поколения
            </p>
          </div>
        </div>

        <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
          <li>Генерация текстов и кода любой сложности</li>
          <li>Помощь в решении повседневных задач</li>
          <li>Быстрые ответы на любые вопросы</li>
        </ul>

        {/* Кнопка создания тикета */}
        <motion.button
          className="modalSubmitBtn"
          style={{ width: '100%', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          onClick={handleRequestAccess}
          disabled={loading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {loading ? (
            'Создание заявки...'
          ) : (
            <>
              <MessageSquare size={18} /> Получить доступ
            </>
          )}
        </motion.button>
        
        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '12px' }}>
          После нажатия будет создан диалог с поддержкой для активации услуги.
        </p>
      </div>

    </motion.div>
  );
}