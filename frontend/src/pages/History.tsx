import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ArrowDownToLine, RefreshCcw, Plus } from 'lucide-react';
import { useTransactions } from '../hooks/useTransactions';
import { useBalance } from '../hooks/useBalance';

export default function History() {
  const navigate = useNavigate();
  const { transactions, loading: transactionsLoading } = useTransactions();
  const { balance, loading: balanceLoading } = useBalance();

  // Анимация страницы
  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    in: { opacity: 1, x: 0 },
    out: { opacity: 0, x: -20 }
  };

  if (transactionsLoading || balanceLoading) {
    return (
      <div className="historyPage container">
        <div className="historyHeader">
          <button className="backButton" onClick={() => navigate('/vpn')}>
            <ChevronLeft size={24} />
          </button>
          <h1>История</h1>
          <button className="topupSmallButton" onClick={() => navigate('/topup')}>
            <Plus size={18} />
            <span>{balance} ₽</span>
          </button>
        </div>
        <div className="loadingMessage" style={{ background: 'transparent', marginTop: '40px' }}>
          ⏳ Загрузка истории...
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="historyPage container"
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="historyHeader">
        <motion.button 
          className="backButton" 
          onClick={() => navigate('/vpn')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronLeft size={24} />
        </motion.button>
        <h1>История</h1>
        <motion.button 
          className="topupSmallButton" 
          onClick={() => navigate('/topup')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus size={18} />
          <span>{balance} ₽</span>
        </motion.button>
      </div>

      <div className="transactionsList">
        {Object.entries(transactions).map(([date, items]: [string, any[]], groupIdx) => (
          <motion.div 
            key={date} 
            className="transactionGroup"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIdx * 0.1 }}
          >
            <div className="transactionDate">{date}</div>
            {items.map((item, itemIdx) => {
              const isTopup = item.description.includes('Пополнение');
              const Icon = isTopup ? ArrowDownToLine : RefreshCcw;
              
              return (
                <motion.div 
                  key={itemIdx} 
                  className="transactionRow"
                  whileHover={{ scale: 1.01, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div 
                    className="transactionIcon" 
                    style={{ 
                      background: isTopup ? 'var(--success-alpha)' : 'var(--danger-alpha)',
                      color: isTopup ? 'var(--success)' : 'var(--danger)'
                    }}
                  >
                    <Icon size={20} />
                  </div>
                  <div className="transactionInfo">
                    <span className="transactionDesc">{item.description}</span>
                    <span className="transactionTime">{item.time}</span>
                  </div>
                  {item.amount !== 0 && (
                    <span className={`transactionAmount ${item.amount > 0 ? 'positive' : 'negative'}`}>
                      {item.amount > 0 ? '+' : ''}{item.amount} ₽
                    </span>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        ))}
        
        {Object.keys(transactions).length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            style={{ textAlign: 'center', marginTop: '60px', color: 'var(--text-tertiary)' }}
          >
            История операций пуста
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}