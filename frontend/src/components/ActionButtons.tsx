import { useNavigate } from 'react-router-dom';
import { ReactComponent as PlusCircle } from '../assets/icons/plus-circle.svg';
import { ReactComponent as Clock } from '../assets/icons/clock.svg';

export default function ActionButtons() {
  const navigate = useNavigate();

  return (
    <div className="actionsRow">
      <button className="actionBtnSmall" onClick={() => navigate('/topup')}>
        <PlusCircle width={20} height={20} />
        Пополнить
      </button>
      <button className="actionBtnSmall" onClick={() => navigate('/history')}>
        <Clock width={20} height={20} />
        История
      </button>
    </div>
  );
}