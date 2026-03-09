import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, CreditCard, Wallet } from 'lucide-react';
import { useBalance } from '../hooks/useBalance';
import { api } from '../api/client';
import { toast } from 'sonner';

const PRESET_AMOUNTS = [100, 300, 500];

export default function TopUp() {
  const navigate = useNavigate();
  const { balance, refetch: refetchBalance } = useBalance();
  const [selected, setSelected] = useState<number | 'custom'>(100);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    const amount = selected === 'custom' ? Number(customAmount) : selected;
    
    if (!amount || amount < 1) {
      toast.error('Введите корректную сумму');
      return;
    }

    setLoading(true);
    try {
      await api.balance.topup(amount);
      
      toast.success(`Баланс пополнен на ${amount} ₽`);
      
      await refetchBalance();
      setTimeout(() => navigate('/'), 1500);
    } catch (error: any) {
      console.error('Topup error:', error);
      toast.error(error.message || 'Ошибка пополнения');
    } finally {
      setLoading(false);
    }
  };

  const newBalance = (balance || 0) + (selected === 'custom' ? Number(customAmount) || 0 : selected);

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
              placeholder="Введите сумму..."
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="infoMessage">
        <Wallet size={20} className="infoIcon" />
        <p>Средства зачисляются моментально. Их можно использовать для покупки и продления VPN.</p>
      </div>

      <motion.button 
        className="payButton"
        onClick={handlePay}
        disabled={loading || (selected === 'custom' && !customAmount)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <CreditCard size={20} />
        {loading ? 'Обработка...' : 'Пополнить'}
      </motion.button>
    </motion.div>
  );
}