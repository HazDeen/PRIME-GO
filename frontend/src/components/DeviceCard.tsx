import { useNavigate } from 'react-router-dom';
import { ReactComponent as ChevronRight } from '../assets/icons/chevron-right.svg';
import { ReactComponent as Apple } from '../assets/icons/apple.svg';
import { ReactComponent as Android } from '../assets/icons/android.svg';
import { ReactComponent as Laptop } from '../assets/icons/laptop.svg';
import { ReactComponent as Monitor } from '../assets/icons/monitor.svg';
import { ReactComponent as Cpu } from '../assets/icons/cpu.svg';
import type { DeviceType } from '../types/device';

type Props = {
  id: number;
  name: string;
  model: string;
  type: DeviceType;
  date: string;
  isActive: boolean;
  daysLeft?: number;
  configLink: string;
};

const getDeviceIcon = (type: DeviceType) => {
  switch (type) {
    case 'iPhone':
      return Apple;
    case 'Android':
      return Android;
    case 'Mac':
      return Laptop;
    case 'PC':
      return Monitor;
    case 'Other':
      return Cpu;
    default:
      return Apple;
  }
};

export default function DeviceCard({ id, name, model, type, date, isActive, daysLeft = 0 }: Props) {
  const navigate = useNavigate();
  const Icon = getDeviceIcon(type);

  return (
    <div 
      className="deviceCard" 
      onClick={() => navigate(`/device/${id}`)}
    >
      <div className="deviceIcon">
        <Icon width={22} height={22} />
      </div>
      
      <div className="deviceInfo">
        <div className="deviceNameRow">
          <div className="deviceNameWrapper">
            <span className="deviceName">{name}</span>
            <span className="deviceOriginalName">{model}</span>
          </div>
          {isActive ? (
            <span className="activeDot" title="Активно" />
          ) : (
            <span className="inactiveDot" title="Не активно" />
          )}
        </div>
        <div className="deviceMeta">
          <span className="deviceDate">{date}</span>
          {isActive && daysLeft > 0 && (
            <span className="deviceDaysLeft">⏳ {daysLeft} дн.</span>
          )}
        </div>
      </div>
      
      <ChevronRight width={20} height={20} className="deviceChevron" />
    </div>
  );
}