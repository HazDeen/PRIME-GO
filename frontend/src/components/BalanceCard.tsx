import { useBalance } from '../hooks/useBalance';
import { useAuth } from '../context/AuthContext';

export default function BalanceCard() {
  const { balance, loading } = useBalance();
  const { user } = useAuth();

  if (loading) {
    return (
      <div className="balanceContainer">
        <div className="balanceAmount">...</div>
        <div className="balanceHint">Загрузка...</div>
      </div>
    );
  }

  // Если баланс 0, но у пользователя есть баланс - показываем его
  const displayBalance = balance === 0 && user?.balance ? user.balance : balance;

  return (
    <div className="balanceContainer">
      <div className="balanceAmount">{displayBalance} ₽</div>
    </div>
  );
}