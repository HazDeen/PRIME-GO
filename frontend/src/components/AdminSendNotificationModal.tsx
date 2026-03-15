// frontend/src/components/AdminSendNotificationModal.tsx

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ChevronDown, Check, Bell } from "lucide-react";
import { toast } from 'sonner';

type Props = {
  onClose: () => void;
  onSend: (data: { userIds?: number[], sendToAll: boolean, title: string, message: string }) => Promise<void>;
  users: any[];
};

export default function AdminSendNotificationModal({ onClose, onSend, users }: Props) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sendToAll, setSendToAll] = useState(false);
  
  // Изменили на массив
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => onClose(), 250);
  };

  const toggleUser = (id: number) => {
    setSelectedUserIds(prev => 
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!sendToAll && selectedUserIds.length === 0) return toast.error('Выберите получателей');
    if (!title.trim()) return toast.error('Введите заголовок');
    if (!message.trim()) return toast.error('Введите текст уведомления');

    setLoading(true);
    try {
      await onSend({ 
        userIds: selectedUserIds.length > 0 ? selectedUserIds : undefined, 
        sendToAll, 
        title, 
        message 
      });
      toast.success('Уведомления отправлены!');
      handleClose();
    } catch (e: any) {
      toast.error(e.message || 'Ошибка отправки');
    } finally {
      setLoading(false);
    }
  };

  // Красивый текст для инпута
  const getSelectedText = () => {
    if (selectedUserIds.length === 0) return "Выберите пользователей...";
    if (selectedUserIds.length === 1) {
        const user = users.find(u => u.id === selectedUserIds[0]);
        return user ? (user.username || `ID: ${user.telegramId}`) : "Выбран 1 пользователь";
    }
    return `Выбрано пользователей: ${selectedUserIds.length}`;
  };

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
        
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '20px', background: 'var(--accent-alpha)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bell size={28} />
            </div>
        </div>

        <h2 className="modalTitle" style={{ textAlign: 'center' }}>Отправить уведомление</h2>
        <p className="modalSub" style={{ textAlign: 'center' }}>Пользователи увидят его в своем профиле</p>

        {/* ТУМБЛЕР: Отправить всем */}
        <div className="extraSettingsPanel" style={{ marginBottom: '20px' }}>
          <div className="restrictionItem">
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Отправить всем пользователям</span>
            <label className="premiumSwitch">
              <input type="checkbox" checked={sendToAll} onChange={() => {
                  setSendToAll(!sendToAll);
                  if (!sendToAll) setSelectedUserIds([]); // очищаем выбор, если жмем "Всем"
              }} />
              <span className="slider round" style={{ borderColor: sendToAll ? 'var(--success)' : '' }}></span>
            </label>
          </div>
        </div>

        {/* 1. ВЫБОР ПОЛЬЗОВАТЕЛЕЙ (Скрыт, если "Отправить всем") */}
        <AnimatePresence>
            {!sendToAll && (
                <motion.div 
                    initial={{ height: 0, opacity: 0 }} 
                    animate={{ height: 'auto', opacity: 1 }} 
                    exit={{ height: 0, opacity: 0 }}
                    style={{ overflow: 'visible' }} 
                >
                    <div className="modalField" style={{ position: 'relative', zIndex: isDropdownOpen ? 50 : 1 }}>
                        <label className="modalLabel">Получатели</label>
                        <div style={{ position: 'relative', marginBottom: '24px' }}>
                            <div 
                                className="modalInput"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsDropdownOpen(!isDropdownOpen);
                                }}
                                style={{ 
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
                                    marginBottom: 0,
                                    borderBottomLeftRadius: isDropdownOpen ? '0' : '20px',
                                    borderBottomRightRadius: isDropdownOpen ? '0' : '20px',
                                    borderColor: isDropdownOpen || selectedUserIds.length > 0 ? 'var(--text-primary)' : 'var(--border-input)',
                                    borderBottomColor: isDropdownOpen ? 'transparent' : 'var(--border-input)',
                                    background: isDropdownOpen ? 'var(--bg-list)' : 'var(--bg-input)',
                                    transition: 'all 0.2s ease',
                                    position: 'relative',
                                    zIndex: 2
                                }}
                            >
                                <span style={{ color: selectedUserIds.length > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: selectedUserIds.length > 0 ? 600 : 400 }}>
                                    {getSelectedText()}
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
                                            position: 'absolute', top: '100%', left: 0, right: 0,
                                            background: 'var(--bg-list)',
                                            border: '1px solid var(--text-primary)',
                                            borderTop: '1px solid var(--border-color)',
                                            borderBottomLeftRadius: '20px', borderBottomRightRadius: '20px',
                                            maxHeight: '220px', overflowY: 'auto',
                                            boxShadow: '0 15px 40px rgba(0,0,0,0.6)',
                                            padding: '8px', paddingTop: '4px', zIndex: 1
                                        }}
                                    >
                                        {users.map(u => {
                                            const isSelected = selectedUserIds.includes(u.id);
                                            return (
                                                <div 
                                                    key={u.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // Не закрываем список при клике
                                                        toggleUser(u.id);
                                                    }}
                                                    style={{
                                                        padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                        cursor: 'pointer', borderRadius: '14px',
                                                        background: isSelected ? 'var(--accent-alpha)' : 'transparent',
                                                        color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                                                        marginBottom: '4px', transition: 'all 0.2s ease'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)';
                                                        e.currentTarget.style.color = 'var(--text-primary)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!isSelected) {
                                                            e.currentTarget.style.background = 'transparent';
                                                            e.currentTarget.style.color = 'var(--text-secondary)';
                                                        }
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        <span style={{ fontWeight: 600, fontSize: '15px' }}>{u.username || 'Без ника'}</span>
                                                        <span style={{ fontSize: '12px', color: isSelected ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>ID: {u.telegramId}</span>
                                                    </div>
                                                    {isSelected && <Check size={18} color="var(--text-primary)" />}
                                                </div>
                                            )
                                        })}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* 2. ЗАГОЛОВОК */}
        <div className="modalField">
          <label className="modalLabel">Заголовок</label>
          <input
            className="modalInput"
            placeholder="Например: Обновление серверов"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* 3. ТЕКСТ УВЕДОМЛЕНИЯ */}
        <div className="modalField">
          <label className="modalLabel">Текст уведомления</label>
          <textarea
            className="modalInput no-scrollbar"
            placeholder="Суть сообщения..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{ minHeight: '120px', resize: 'vertical', borderRadius: '20px' }}
          />
        </div>

        {/* КНОПКИ */}
        <div className="modalActionsRow">
          <button className="modalSubmitBtn" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Отправка...' : 'Отправить'}
          </button>
          <button className="modalCancelBtn" onClick={handleClose}>Отмена</button>
        </div>
      </motion.div>
    </motion.div>
  );
}