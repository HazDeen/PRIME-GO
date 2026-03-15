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
        <div className="modalField" style={{ position: 'relative', zIndex: isDropdownOpen ? 50 : 1 }}>
          <label className="modalLabel">Пользователь</label>
          
          {/* Обёртка для бесшовного объединения поля и списка */}
          <div style={{ position: 'relative', marginBottom: '24px' }}>
            <div 
              className="modalInput"
              onClick={(e) => {
                e.stopPropagation();
                setIsDropdownOpen(!isDropdownOpen);
              }}
              style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
                marginBottom: 0, // Убираем отступ, чтобы прилепить список
                borderBottomLeftRadius: isDropdownOpen ? '0' : '20px', // Убираем закругления снизу
                borderBottomRightRadius: isDropdownOpen ? '0' : '20px',
                borderColor: isDropdownOpen ? 'var(--text-primary)' : 'var(--border-input)',
                borderBottomColor: isDropdownOpen ? 'transparent' : 'var(--border-input)', // Скрываем нижнюю рамку поля
                background: isDropdownOpen ? 'var(--bg-input)' : 'var(--bg-input)', // Плотный фон при открытии
                transition: 'all 0.2s ease',
                position: 'relative',
                zIndex: 2 // Поле поверх списка
              }}
            >
              <span style={{ 
                color: selectedUser ? 'var(--text-primary)' : 'var(--text-tertiary)',
                fontWeight: selectedUser ? 500 : 400 
              }}>
                {selectedUser ? (selectedUser.username || `ID: ${selectedUser.telegramId}`) : "Выберите пользователя..."}
              </span>
              <motion.div animate={{ rotate: isDropdownOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown size={20} color={isDropdownOpen ? 'var(--text-primary)' : 'var(--text-secondary)'} />
              </motion.div>
            </div>

            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  className="no-scrollbar"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  style={{
                    position: 'absolute', 
                    top: '100%', // Идеально стыкуется с низом поля
                    left: 0, right: 0,
                    background: 'var(--bg-list)', // ПЛОТНЫЙ ФОН БЕЗ BLUR
                    backdropFilter: 'blur(12px)', // Эффект стекла
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid var(--text-primary)', // Общая рамка с полем
                    borderTop: '1px solid var(--border-input)', // Тонкий разделитель внутри
                    borderBottomLeftRadius: '20px', 
                    borderBottomRightRadius: '20px', 
                    maxHeight: '220px', 
                    overflowY: 'auto',
                    boxShadow: '0 15px 40px rgba(0,0,0,0.6)', 
                    padding: '8px',
                    paddingTop: '4px',
                    zIndex: 1
                  }}
                >
                  {users.map(u => (
                    <div 
                      key={u.id}
                      onClick={() => { setSelectedUserId(u.id); setIsDropdownOpen(false); }}
                      style={{
                        padding: '12px 14px', 
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        cursor: 'pointer', 
                        borderRadius: '14px', 
                        background: selectedUserId === u.id ? 'var(--accent-alpha)' : 'transparent',
                        color: selectedUserId === u.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                        marginBottom: '4px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedUserId !== u.id) e.currentTarget.style.background = 'var(--bg-hover)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                      }}
                      onMouseLeave={(e) => {
                        if (selectedUserId !== u.id) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontWeight: 600, fontSize: '15px' }}>
                          {u.username || 'Без ника'}
                        </span>
                        <span style={{ 
                          fontSize: '12px', 
                          color: selectedUserId === u.id ? 'var(--text-secondary)' : 'var(--text-tertiary)' 
                        }}>
                          ID: {u.telegramId}
                        </span>
                      </div>
                      {selectedUserId === u.id && <Check size={18} color="var(--text-primary)" />}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 2. 🌍 ВЫБОР СЕРВЕРА (Убрали костыль с marginTop) */}
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