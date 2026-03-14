import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Bitcoin, Wallet } from 'lucide-react';
import { useBalance } from '../hooks/useBalance';
import { client } from '../api/client';
import { toast } from 'sonner';

const PRESET_AMOUNTS = [100, 300, 500];

export default function TopUp() {
  const navigate = useNavigate();
  const { balance } = useBalance();
  
  const [selected, setSelected] = useState<number | 'custom'>(100);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);

  // Вычисляем текущую выбранную сумму
  const currentAmount = selected === 'custom' ? Number(customAmount) : selected;
  // Вычисляем превью нового баланса
  const newBalance = (balance || 0) + (currentAmount || 0);

  const handlePay = async () => {
    if (!currentAmount || currentAmount < 50) {
      toast.error('Минимальная сумма пополнения — 50 ₽');
      return;
    }

    setLoading(true);
    try {
      // Создаем счет в CryptoBot через наш бэкенд
      const response = await client.payments.create(currentAmount);
      // Перенаправляем пользователя на страницу оплаты в Telegram
      window.location.href = response.url;
    } catch (error: any) {
      toast.error(error.message || 'Ошибка создания платежа');
      setLoading(false);
    }
  };

  // Плавная анимация появления страницы
  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    in: { opacity: 1, x: 0 },
    out: { opacity: 0, x: -20 }
  };

  return (
    <motion.div 
      className="topupPage container"
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{ paddingTop: '20px' }}
    >
      <div className="topupHeader">
        <motion.button 
          className="backButton" 
          onClick={() => navigate(-1)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronLeft size={24} />
        </motion.button>
        <h1>Пополнение баланса</h1>
      </div>

      <motion.div 
        className="balancePreview"
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
      >
        <span className="previewLabel">Баланс после пополнения</span>
        <span className="previewAmount">{newBalance} ₽</span>
      </motion.div>

      <div className="amountSelector">
        <p className="selectorTitle">Выберите сумму</p>
        
        <div className="amountGrid">
          {PRESET_AMOUNTS.map((amount) => (
            <motion.button
              key={amount}
              className={`amountChip ${selected === amount ? 'active' : ''}`}
              onClick={() => setSelected(amount)}
              whileTap={{ scale: 0.95 }}
            >
              {amount} ₽
            </motion.button>
          ))}
        </div>

        <motion.button
          className={`customChip ${selected === 'custom' ? 'active' : ''}`}
          onClick={() => setSelected('custom')}
          whileTap={{ scale: 0.95 }}
        >
          Другое
        </motion.button>

        {/* Анимация появления инпута для своей суммы */}
        <AnimatePresence>
          {selected === 'custom' && (
            <motion.input
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              type="number"
              className="customAmountInput"
              placeholder="Введите сумму (от 50 ₽)..."
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Информационный блок о крипто-платеже */}
      <div style={{ marginBottom: '24px', marginTop: '16px' }}>
        <div style={{ 
            display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', 
            background: 'var(--accent-alpha)',
            border: '1px solid var(--accent)',
            borderRadius: '16px'
          }}
        >
          <Bitcoin size={28} color="var(--accent)" />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Telegram CryptoBot</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Мгновенная оплата в USDT, TON, BTC и др.
            </div>
          </div>
        </div>
      </div>

      <div className="infoMessage">
        <Wallet size={20} className="infoIcon" />
        <p>Средства зачисляются моментально. Их можно использовать для покупки и продления VPN.</p>
      </div>

      <motion.button 
        className="payButton"
        onClick={handlePay}
        disabled={loading || (selected === 'custom' && (!customAmount || Number(customAmount) < 50))}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        style={{ opacity: loading || (selected === 'custom' && (!customAmount || Number(customAmount) < 50)) ? 0.7 : 1 }}
      >
        <Bitcoin size={20} />
        {loading ? 'Создание счета...' : `Пополнить на ${currentAmount || 0} ₽`}
      </motion.button>
    </motion.div>
  );
}