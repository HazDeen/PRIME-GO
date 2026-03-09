import { useDevices } from '../hooks/useDevices';
import DeviceCard from './DeviceCard';
import { Plus} from 'lucide-react';


type Props = {
  onAddClick: () => void;
};

export default function DevicesCard({ onAddClick }: Props) {
  const { devices, loading } = useDevices();

  if (loading) {
    return <div className="devicesCard">Загрузка устройств...</div>;
  }

  return (
    <div className="devicesCard">
      <div className="devicesCardHeader">
        <div className="devicesCardTitle">
          <h3 className="sectionTitle">Мои устройства</h3>
          <span className="devicesCount">{devices.length}</span>
        </div>
        <button className="addButton" onClick={onAddClick}>
          <Plus width={18} height={18} />
          Добавить
        </button>
      </div>

      <div className="devicesList">
        {devices.map(device => (
          <DeviceCard 
            key={device.id} 
            id={device.id}
            name={device.name}
            model={device.model}
            type={device.type}  // 👈 ТЕПЕРЬ ТИП СТРОГИЙ
            date={device.date}
            isActive={device.isActive}
            configLink={device.configLink}
            daysLeft={device.daysLeft}
          />
        ))}
      </div>

      <div className="tariffInfo">
        Тариф 300 ₽/мес за одно устройство
      </div>
    </div>
  );
}