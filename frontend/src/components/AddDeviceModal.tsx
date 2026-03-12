import { motion } from "framer-motion";
import { useState } from "react";
import { Smartphone, Bot, Laptop, Monitor, Cpu, Globe } from 'lucide-react';
import { toast } from 'sonner';
import type { DeviceType } from '../types/device';

type Props = {
  onClose: () => void;
  onAdd: (name: string, customName: string, type: DeviceType, location: string) => Promise<void>;
  tgUserId: string;
  isBlocked?: boolean
};

const DEVICE_TYPES: { id: DeviceType; label: string; icon: any }[] = [
  { id: "iPhone", label: "iPhone", icon: Smartphone },
  { id: "Android", label: "Android", icon: Bot },
  { id: "Mac", label: "Mac", icon: Laptop },
  { id: "PC", label: "PC", icon: Monitor },
  { id: "Other", label: "Другое", icon: Cpu },
];

const LOCATIONS = [
  { id: 'ch', label: 'Швейцария', flag: '🇨🇭', desc: 'Быстрый (300 ₽)' },
  { id: 'at', label: 'Австрия', flag: '🇦🇹', desc: 'Базовый (150 ₽)' }
];

export default function AddDeviceModal({ onClose, onAdd, isBlocked }: Props) {
  const [name, setName] = useState("");
  const [customName, setCustomName] = useState("");
  const [selectedType, setSelectedType] = useState<DeviceType>("iPhone");
  const [selectedLocation, setSelectedLocation] = useState<string>("ch");
  const [isClosing, setIsClosing] = useState(false);
  const [loading, setLoading] = useState(false);

  // 🌟 Динамическая цена в зависимости от выбранного сервера
  const currentPrice = selectedLocation === 'at' ? 150 : 300;

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => onClose(), 200);
  };

  const handleSubmit = async () => {
    if (isBlocked) {
      toast.error('Создание новых подключений временно приостановлено');
      return;
    }

    if (!name.trim() && !customName.trim()) {
      toast.error('Введите название устройства');
      return;
    }

    setLoading(true);
    try {
      // Передаем локацию 4-м параметром
      await onAdd(name || customName, customName || name, selectedType, selectedLocation);
      
      toast.success('Устройство успешно добавлено!');
      setTimeout(() => handleClose(), 2000);
    } catch (error: any) {
      toast.error(error.message || 'Не удалось добавить устройство');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      className="modalOverlay bottom"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={handleClose}
    >
      <motion.div
        className="modalSheet"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: "100%" }} animate={{ y: isClosing ? "100%" : 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        drag="y" // Тянем только по вертикали
        dragConstraints={{ top: 0, bottom: 0 }} // Чтобы она не улетала вверх, а только пружинила
        dragElastic={0.2} // Сопротивление при натяжении
        onDragEnd={(_, info) => {
          // Если скорость свайпа или расстояние больше порога — закрываем
          if (info.offset.y > 150 || info.velocity.y > 500) {
            onClose();
          }
        }}
      >
        <motion.div className="modalHandle" onClick={handleClose} />
        
        <h2 className="modalTitle">Новое подключение</h2>

        <div className="modalDescription">
          {/* 🌟 Цена меняется тут */}
          <p className="modalPrice">Стоимость {currentPrice} ₽/мес</p>
          <p className="modalNote">Средства спишутся сразу с баланса</p>
        </div>

        {/* 🌍 ВЫБОР СЕРВЕРА */}
        <div className="modalField" style={{ marginBottom: '20px' }}>
          <label className="modalLabel" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Globe size={16} /> Выберите сервер
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {LOCATIONS.map(loc => (
              <motion.div
                key={loc.id}
                onClick={() => setSelectedLocation(loc.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  padding: '14px', borderRadius: '14px', cursor: 'pointer',
                  background: selectedLocation === loc.id ? 'var(--accent-alpha)' : 'var(--bg-input)',
                  border: selectedLocation === loc.id ? '1px solid var(--accent)' : '1px solid transparent',
                  transition: '0.2s', display: 'flex', alignItems: 'center', gap: '10px'
                }}
              >
                <span style={{ fontSize: '24px' }}>{loc.flag}</span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{loc.label}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{loc.desc}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Инпуты */}
        <div className="modalField">
          <label className="modalLabel">Название <span style={{opacity: 0.5}}>(для вас)</span></label>
          <input className="modalInput" placeholder="Мой iPhone" value={customName} onChange={(e) => setCustomName(e.target.value)} disabled={loading} />
        </div>
        <div className="modalField">
          <label className="modalLabel">Модель устройства</label>
          <input className="modalInput" placeholder="iPhone 15" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
        </div>

        <div className="deviceTypeSelector">
          <label className="modalLabel">Тип устройства</label>
          <div className="deviceTypeGrid">
            {DEVICE_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <motion.button key={type.id} type="button" className={`deviceTypeBtn ${selectedType === type.id ? "active" : ""}`} onClick={() => setSelectedType(type.id)} disabled={loading}>
                  <Icon /> <span>{type.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="modalActionsRow">
          <motion.button className="modalSubmitBtn" onClick={handleSubmit} disabled={loading}>
            {/* 🌟 Цена на кнопке тоже меняется */}
            {loading ? '⏳ Добавление...' : `+ Добавить за ${currentPrice} ₽`}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}