import { motion } from "framer-motion";
import { useState } from "react";
import { ReactComponent as Apple } from '../assets/icons/apple.svg';
import { ReactComponent as Android } from '../assets/icons/android.svg';
import { ReactComponent as Laptop } from '../assets/icons/laptop.svg';
import { ReactComponent as Monitor } from '../assets/icons/monitor.svg';
import { ReactComponent as Cpu } from '../assets/icons/cpu.svg';
import { toast } from 'sonner';
import type { DeviceType } from '../types/device';

type Props = {
  onClose: () => void;
  // onAdd теперь принимает объект, который мы отправим на бэкенд
  onAdd: (name: string, type: DeviceType, customName: string) => Promise<void>;
  tgUserId: string;
};

const DEVICE_TYPES: { id: DeviceType; label: string; icon: any }[] = [
  { id: "iPhone", label: "iPhone", icon: Apple },
  { id: "Android", label: "Android", icon: Android },
  { id: "Mac", label: "Mac", icon: Laptop },
  { id: "PC", label: "PC", icon: Monitor },
  { id: "Other", label: "Другое", icon: Cpu },
];

export default function AddDeviceModal({ onClose, onAdd}: Props) {
  const [name, setName] = useState("");
  const [customName, setCustomName] = useState("");
  const [selectedType, setSelectedType] = useState<DeviceType>("iPhone");
  const [isClosing, setIsClosing] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => onClose(), 200);
  };

  const handleSubmit = async () => {
    if (!name.trim() && !customName.trim()) {
      toast.error('Введите название устройства');
      return;
    }

    setLoading(true);
    try {
      // ВАЖНО: Мы больше не делаем здесь fetch к /xui/client.
      // Вся логика (XUI + БД + Баланс) теперь внутри ОДНОГО вызова onAdd,
      // который обращается к нашему новому контроллеру на бэкенде.
      
      await onAdd(name || customName, selectedType, customName || name);
      
      toast.success('✅ Устройство успешно добавлено!');
      
      // Небольшая задержка перед закрытием для красоты
      setTimeout(() => {
        handleClose();
        // Можно убрать reload, если useDevices правильно обновляет стейт
        window.location.reload(); 
      }, 500);

    } catch (error: any) {
      console.error('❌ Ошибка при добавлении:', error);
      // Ошибку (например, "Недостаточно средств") прокинет бэкенд
      toast.error(error.message || '❌ Не удалось добавить устройство');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      className="modalOverlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleClose}
    >
      <div className="modalBackdrop" />
      
      <motion.div
        className="modalSheet"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: "100%" }}
        animate={{ y: isClosing ? "100%" : 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        <motion.div 
          className="modalHandle" 
          onClick={handleClose}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        />
        
        <h2 className="modalTitle">Добавить новое устройство</h2>

        <div className="modalDescription">
          <p className="modalPrice">
            Стоимость 300 ₽/мес за каждое устройство
          </p>
          <p className="modalNote">
            Средства спишутся сразу, подписка на 30 дней
          </p>
        </div>

        <div className="modalField">
          <label className="modalLabel">
            Название устройства <span style={{ fontSize: '12px', opacity: 0.5 }}>(как оно будет отображаться)</span>
          </label>
          <input
            className="modalInput"
            placeholder="Например: Мой iPhone"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            autoFocus
            disabled={loading}
          />
        </div>

        <div className="modalField">
          <label className="modalLabel">Модель устройства</label>
          <input
            className="modalInput"
            placeholder="Например: iPhone 15"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="deviceTypeSelector">
          <label className="modalLabel">Тип устройства</label>
          <div className="deviceTypeGrid">
            {DEVICE_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <motion.button
                  key={type.id}
                  type="button"
                  className={`deviceTypeBtn ${selectedType === type.id ? "active" : ""}`}
                  onClick={() => setSelectedType(type.id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={loading}
                >
                  <Icon size={24} />
                  <span>{type.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="modalActionsRow">
          <motion.button
            className="modalSubmitBtn"
            onClick={handleSubmit}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
          >
            {loading ? '⏳ Добавление...' : '+ Добавить за 300 ₽'}
          </motion.button>
          
          <motion.button
            className="modalCancelBtn"
            onClick={handleClose}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
          >
            × Отмена
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}