import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ChevronDown, Check, Globe } from "lucide-react"; // 👈 Добавили Globe
import { Smartphone, Bot, Laptop, Monitor, Cpu } from 'lucide-react';
import { toast } from 'sonner';

// 👈 Обновили onAdd, теперь он принимает location (4-й параметр)
type Props = {
  onClose: () => void;
  onAdd: (userId: number, name: string, type: string, location: string) => Promise<void>;
  users: any[];
  isBlocked?: boolean
};

const DEVICE_TYPES = [
  { id: "iPhone", label: "iPhone", icon: Smartphone },
  { id: "Android", label: "Android", icon: Bot },
  { id: "Mac", label: "Mac", icon: Laptop },
  { id: "PC", label: "PC", icon: Monitor },
  { id: "Other", label: "Другое", icon: Cpu },
];

const LOCATIONS = [
  { id: 'ch', label: 'Швейцария', flag: '🇨🇭', desc: 'Ультра быстрый' },
  { id: 'at', label: 'Австрия', flag: '🇦🇹', desc: 'Европейский пинг' }
];

export default function AdminAddDeviceModal({ onClose, onAdd, users, isBlocked }: Props) {
  const [name, setName] = useState("");
  const [selectedType, setSelectedType] = useState("iPhone");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("ch"); // 👈 Стейт локации
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => onClose(), 250);
  };

  const handleSubmit = async () => {
    if (isBlocked) {
      return toast.error('Создание VPN сейчас запрещено настройками');
    }

    if (!selectedUserId) return toast.error('Выберите пользователя');
    if (!name.trim()) return toast.error('Введите название устройства');

    setLoading(true);
    try {
      // 👈 Передаем выбранную локацию
      await onAdd(selectedUserId, name, selectedType, selectedLocation);
      toast.success('Устройство добавлено!');
      handleClose();
    } catch (e: any) {
      toast.error(e.message || 'Ошибка добавления');
    } finally {
      setLoading(false);
    }
  };

  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
    <motion.div 
      className="modalOverlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleClose}
    >
      <motion.div
        className="modalSheet"
        onClick={(e) => {
          e.stopPropagation();
          if (isDropdownOpen) setIsDropdownOpen(false);
        }}
        initial={{ y: "100%" }}
        animate={{ y: isClosing ? "100%" : 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        <div className="modalHandle" onClick={handleClose} />
        
        <h2 className="modalTitle">Добавить VPN (Админ)</h2>
        <p className="modalSub">Устройство будет добавлено выбранному пользователю без списания баланса.</p>

        {/* 1. ПОЛЬЗОВАТЕЛЬ */}
        <div className="modalField" style={{ position: 'relative' }}>
          <label className="modalLabel">Пользователь</label>
          <div 
            className="modalInput"
            onClick={(e) => {
              e.stopPropagation();
              setIsDropdownOpen(!isDropdownOpen);
            }}
            style={{ 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
              marginBottom: isDropdownOpen ? '8px' : '24px',
              borderColor: isDropdownOpen ? 'var(--accent)' : 'var(--border-input)',
              background: isDropdownOpen ? 'var(--accent-alpha)' : 'var(--bg-input)'
            }}
          >
            <span style={{ color: selectedUser ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
              {selectedUser ? (selectedUser.username || `ID: ${selectedUser.telegramId}`) : "Выберите пользователя..."}
            </span>
            <motion.div animate={{ rotate: isDropdownOpen ? 180 : 0 }}>
              <ChevronDown size={20} color="var(--text-secondary)" />
            </motion.div>
          </div>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                className="no-scrollbar"
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                style={{
                  position: 'absolute', top: '72px', left: 0, right: 0,
                  background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                  borderRadius: '16px', maxHeight: '160px', overflowY: 'auto',
                  zIndex: 10, boxShadow: '0 8px 30px rgba(0,0,0,0.2)'
                }}
              >
                {users.map(u => (
                  <div 
                    key={u.id}
                    onClick={() => { setSelectedUserId(u.id); setIsDropdownOpen(false); }}
                    style={{
                      padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      cursor: 'pointer', borderBottom: '1px solid var(--border-color)',
                      background: selectedUserId === u.id ? 'var(--accent-alpha)' : 'transparent',
                      color: selectedUserId === u.id ? 'var(--accent)' : 'var(--text-primary)'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600, fontSize: '15px' }}>{u.username || 'Без ника'}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>ID: {u.telegramId}</span>
                    </div>
                    {selectedUserId === u.id && <Check size={18} />}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 2. 🌍 ВЫБОР СЕРВЕРА (Анимация отступа теперь здесь) */}
        <div 
          className="modalField" 
          style={{ 
            marginBottom: '20px',
            marginTop: isDropdownOpen ? '170px' : '0', 
            transition: 'margin 0.2s' 
          }}
        >
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

        {/* 3. НАЗВАНИЕ УСТРОЙСТВА */}
        <div className="modalField">
          <label className="modalLabel">Название устройства</label>
          <input
            className="modalInput"
            placeholder="Например: Рабочий ПК"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* 4. ТИП УСТРОЙСТВА */}
        <div className="deviceTypeSelector">
          <label className="modalLabel">Тип устройства</label>
          <div className="deviceTypeGrid">
            {DEVICE_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  type="button"
                  className={`deviceTypeBtn ${selectedType === type.id ? "active" : ""}`}
                  onClick={() => setSelectedType(type.id)}
                >
                  <Icon width={24} height={24} />
                  <span>{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* КНОПКИ */}
        <div className="modalActionsRow">
          <button className="modalSubmitBtn" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Создание...' : 'Выдать VPN'}
          </button>
          <button className="modalCancelBtn" onClick={handleClose}>Отмена</button>
        </div>
      </motion.div>
    </motion.div>
  );
}