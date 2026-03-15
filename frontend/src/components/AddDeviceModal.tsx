import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Smartphone, Bot, Laptop, Monitor, Cpu, Globe, ArrowLeft, X,
  Edit2, CheckCircle2, CreditCard, Loader2 } from 'lucide-react';
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
  { id: 'ch', label: 'Швейцария', desc: 'Быстрый (300 ₽)', price: 300 },
  { id: 'at', label: 'Австрия', desc: 'Базовый (150 ₽)', price: 150 }
];

// Анимации для перелистывания слайдов
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 50 : -50,
    opacity: 0
  })
};

export default function AddDeviceModal({ onClose, onAdd, isBlocked }: Props) {
  // --- STATE ---
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(0); // 1 = вперед, -1 = назад
  
  const [name, setName] = useState("");
  const [customName, setCustomName] = useState("");
  const [selectedType, setSelectedType] = useState<DeviceType>("iPhone");
  const [selectedLocation, setSelectedLocation] = useState<string>("ch");

  const currentPrice = selectedLocation === 'at' ? 150 : 300;
  
  const [isClosing, setIsClosing] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentLocation = LOCATIONS.find(l => l.id === selectedLocation)!;
  const currentType = DEVICE_TYPES.find(t => t.id === selectedType)!;
  const TypeIcon = currentType.icon;

  // --- ACTIONS ---
  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => onClose(), 200);
  };

  const goToStep = (newStep: number) => {
    setDirection(newStep > step ? 1 : -1);
    setStep(newStep);
  };

  const handleNext = () => {
    if (step === 2 && !name.trim() && !customName.trim()) {
      toast.error('Введите название устройства или модель');
      return;
    }
    if (step < 4) goToStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) goToStep(step - 1);
  };

  const handleSubmit = async () => {
    if (isBlocked) {
      return toast.error('Создание новых подключений временно приостановлено');
    }
    setLoading(true);
    try {
      await onAdd(name || customName, customName || name, selectedType, selectedLocation);
      toast.success('Устройство успешно добавлено!');
      setTimeout(() => handleClose(), 2000);
    } catch (error: any) {
      toast.error(error.message || 'Не удалось добавить устройство');
    } finally {
      setLoading(false);
    }
  };

  // --- РЕНДЕР ШАГОВ ---
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="wizardStep">
            <h3 className="wizardStepTitle">Выберите сервер</h3>
            <p className="wizardStepDesc">От локации зависит скорость и стоимость</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginTop: '16px' }}>
              {LOCATIONS.map(loc => (
                <motion.div
                  key={loc.id}
                  onClick={() => setSelectedLocation(loc.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    padding: '16px', borderRadius: '16px', cursor: 'pointer',
                    background: selectedLocation === loc.id ? 'var(--accent-alpha)' : 'var(--bg-input)',
                    border: selectedLocation === loc.id ? '2px solid var(--accent)' : '2px solid transparent',
                    transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {/* Используем loc.id (ch или at) для генерации нужного класса флага */}
                    <span 
                      className={`fi fi-${loc.id}`} 
                      style={{ 
                        fontSize: '28px', 
                        borderRadius: '4px', /* Слегка закругляем углы для красоты */
                        overflow: 'hidden',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }} 
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>{loc.label}</span>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{loc.desc}</span>
                    </div>
                  </div>
                  {selectedLocation === loc.id && <CheckCircle2 size={24} color="var(--accent)" />}
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="wizardStep">
            <h3 className="wizardStepTitle">Как назовем устройство?</h3>
            <p className="wizardStepDesc">Эти данные нужны только вам для удобства</p>
            <div style={{ marginTop: '16px' }}>
              <div className="modalField">
                <label className="modalLabel">Название <span style={{opacity: 0.5}}>(например: Мой телефон)</span></label>
                <input className="modalInput" autoFocus placeholder="Введите название..." value={customName} onChange={(e) => setCustomName(e.target.value)} />
              </div>
              <div className="modalField" style={{ marginTop: '12px' }}>
                <label className="modalLabel">Модель <span style={{opacity: 0.5}}>(например: iPhone 15)</span></label>
                <input className="modalInput" placeholder="Введите модель..." value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="wizardStep">
            <h3 className="wizardStepTitle">Выберите тип устройства</h3>
            <p className="wizardStepDesc">Для подбора правильной инструкции</p>
            <div className="deviceTypeGrid" style={{ marginTop: '16px' }}>
              {DEVICE_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <motion.button key={type.id} type="button" className={`deviceTypeBtn ${selectedType === type.id ? "active" : ""}`} onClick={() => setSelectedType(type.id)}>
                    <Icon /> <span>{type.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="wizardStep">
            <h3 className="wizardStepTitle">Подтверждение</h3>
            <p className="wizardStepDesc">Проверьте данные перед созданием</p>
            
            <div style={{ background: 'var(--bg-input)', borderRadius: '16px', padding: '16px', marginTop: '16px' }}>
              <div style={{ background: 'var(--bg-input)', borderRadius: '16px', padding: '16px', marginTop: '16px' }}>
              {/* Строка локации */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Globe size={18} color="var(--text-secondary)" />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Сервер:</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => goToStep(1)}> {/* 👈 ЗДЕСЬ */}
                  {currentLocation ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className={`fi fi-${currentLocation.id}`} style={{ fontSize: '14px', borderRadius: '2px', overflow: 'hidden' }} />
                      <span style={{ fontWeight: 600 }}>{currentLocation.label}</span>
                    </div>
                  ) : (
                    <span style={{ fontWeight: 600 }}>🌐 ...</span>
                  )}
                  <Edit2 size={14} color="var(--accent)" />
                </div>
              </div>

              {/* Строка названия */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Edit2 size={18} color="var(--text-secondary)" />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Название:</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => goToStep(2)}> {/* 👈 И ЗДЕСЬ */}
                  <span style={{ fontWeight: 600 }}>{customName || name}</span>
                  <Edit2 size={14} color="var(--accent)" />
                </div>
              </div>

              {/* Строка платформы */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TypeIcon size={18} color="var(--text-secondary)" />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Платформа:</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => goToStep(3)}> {/* 👈 И ЗДЕСЬ */}
                  <span style={{ fontWeight: 600 }}>{currentType.label}</span>
                  <Edit2 size={14} color="var(--accent)" />
                </div>
              </div>
            </div>
            </div>

            {/* Итоговая цена */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '0 8px' }}>
              <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>К списанию:</span>
              <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent)' }}>{currentLocation.price} ₽</span>
            </div>
          </div>
        );
    }
  };

  return (
    <motion.div 
      className="modalOverlay center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={handleClose}
    >
      <motion.div
        className="modalSheet"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
        animate={{ opacity: isClosing ? 0 : 1, scale: isClosing ? 0.95 : 1, y: isClosing ? 20 : 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        style={{ borderRadius: '32px' }}
      >
        <button className="modalCloseBtn" onClick={handleClose}>
          <X size={18} />
        </button>
        
        {/* ПРОГРЕСС-БАР ВЕРХУ */}
        <div style={{ width: '100%', height: '4px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px', marginTop: '30px' }}>
          <motion.div 
            initial={{ width: '25%' }}
            animate={{ width: `${(step / 4) * 100}%` }} 
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{ height: '100%', background: 'var(--accent)', borderRadius: '4px' }} 
          />
        </div>

        {/* ШАПКА С КНОПКОЙ НАЗАД */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', height: '32px' }}>
          {step > 1 && (
            <motion.button 
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              onClick={handleBack} 
              style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
            >
              <ArrowLeft size={24} />
            </motion.button>
          )}
          <span style={{ marginLeft: step > 1 ? '12px' : '0', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '14px' }}>
            Шаг {step} из 4
          </span>
        </div>

        {/* КОНТЕНТ СЛАЙДОВ */}
        <div 
          style={{ position: 'relative', overflowX: 'hidden', overflowY: 'auto', maxHeight: '55vh', minHeight: '300px' }}
          onPointerDownCapture={(e) => e.stopPropagation()}
          onWheelCapture={(e) => e.stopPropagation()}
        >
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "tween", ease: "easeInOut", duration: 0.25 }}
              style={{ width: '100%' }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* НИЖНИЕ КНОПКИ */}
        <div className="modalActionsRow" style={{ marginTop: '20px', flexShrink: 0 }}>
          {step < 4 ? (
            <motion.button className="modalSubmitBtn" onClick={handleNext} whileTap={{ scale: 0.98 }}>
              Далее
            </motion.button>
          ) : (
            <motion.button 
              className="modalSubmitBtn danger" 
              style={{ 
                  margin: 0, 
                  marginLeft: 'auto', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: '8px' 
              }} 
              onClick={handleSubmit} 
              disabled={loading || isBlocked}
          >
              {loading ? (
                  <>
                      <motion.div 
                          animate={{ rotate: 360 }} 
                          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                          style={{ display: 'flex', alignItems: 'center' }}
                      >
                          <Loader2 size={18} />
                      </motion.div>
                      Оплата...
                  </>
              ) : (
                  <>
                      <CreditCard size={18} /> 
                      Оплатить {currentPrice} ₽
                  </>
              )}
          </motion.button>
          )}
        </div>

      </motion.div>
    </motion.div>
  );
}