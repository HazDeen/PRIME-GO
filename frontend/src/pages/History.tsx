import { useNavigate } from 'react-router-dom';
import { ReactComponent as ArrowLeft } from '../assets/icons/arrow-left.svg';
import { ReactComponent as ArrowDownCircle } from '../assets/icons/arrow-down-circle.svg';
import { ReactComponent as RefreshCw } from '../assets/icons/refresh-cw.svg';
import { ReactComponent as PlusCircle } from '../assets/icons/plus-circle.svg';
import { useTransactions } from '../hooks/useTransactions';
import { useBalance } from '../hooks/useBalance';

export default function History() {
  const navigate = useNavigate();
  const { transactions, loading: transactionsLoading } = useTransactions();
  const { balance, loading: balanceLoading } = useBalance();

  if (transactionsLoading || balanceLoading) {
    return (
      <div className="historyPage">
        <div className="historyHeader">
          <button className="backButton" onClick={() => navigate(-1)}>
            <ArrowLeft width={24} height={24} />
          </button>
          <h1>История платежей</h1>
          <button className="topupSmallButton" onClick={() => navigate('/topup')}>
            <PlusCircle width={20} height={20} />
            <span>{balance} ₽</span>
          </button>
        </div>
        <div style={{ textAlign: 'center', marginTop: '40px', color: 'rgba(255,255,255,0.5)' }}>
          Загрузка...
        </div>
      </div>
    );
  }

  return (
    <div className="historyPage">
      <div className="historyHeader">
        <button className="backButton" onClick={() => navigate(-1)}>
          <ArrowLeft width={24} height={24} />
        </button>
        <h1>История платежей</h1>
        <button className="topupSmallButton" onClick={() => navigate('/topup')}>
          <PlusCircle width={20} height={20} />
          <span>{balance} ₽</span>
        </button>
      </div>

      <div className="transactionsList">
        {Object.entries(transactions).map(([date, items]: [string, any[]]) => (
          <div key={date} className="transactionGroup">
            <div className="transactionDate">{date}</div>
            {items.map((item, itemIdx) => {
              // Определяем иконку в зависимости от типа операции
              const isTopup = item.description.includes('Пополнение');
              
              let Icon = RefreshCw;
              let iconColor = '#FF9F0A';
              
              if (isTopup) {
                Icon = ArrowDownCircle;
                iconColor = '#34C759';
              }
              
              return (
                <div key={itemIdx} className="transactionRow">
                  <div className="transactionIcon" style={{ background: `${iconColor}10` }}>
                    <Icon width={20} height={20} color={iconColor} />
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
                </div>
              );
            })}
          </div>
        ))}
        
        {Object.keys(transactions).length === 0 && (
          <div style={{ textAlign: 'center', marginTop: '40px', color: 'rgba(255,255,255,0.5)' }}>
            Нет операций
          </div>
        )}
      </div>
    </div>
  );
}