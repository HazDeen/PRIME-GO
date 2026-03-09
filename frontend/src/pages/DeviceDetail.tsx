import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, Edit2, Trash2, Smartphone, 
  Check, AlertCircle, AlertTriangle, Copy, RefreshCw, X, Timer 
} from 'lucide-react';

export default function DeviceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [device, setDevice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Конвертируем ID в число
  const deviceId = id ? parseInt(id) : null;

  useEffect(() => {
    if (!deviceId) {
      navigate('/');
      return;
    }
    loadDevice();
  }, [deviceId]);

  const loadDevice = async () => {
    try {
      setLoading(true);
      
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        navigate('/');
        return;
      }
      const user = JSON.parse(userStr);

      const response = await fetch(`https://vpn-production-702c.up.railway.app/devices/user/${user.telegramId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Ошибка сервера');

      const devices = await response.json();
      
      const currentDevice = devices.find((d: any) => d.id === deviceId);
      
      if (currentDevice) {
        setDevice(currentDevice);
        setDeviceName(currentDevice.name || currentDevice.customName);
      } else {
        toast.error('Устройство не найдено в вашем списке');
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to load device:', error);
      toast.error('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (device?.configLink) {
      navigator.clipboard.writeText(device.configLink);
      setCopied(true);
      toast.success('Ссылка скопирована!', {
        icon: '📋',
        duration: 2000
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReplaceLink = async () => {
    if (!deviceId) return;
    toast.loading('Генерируем новую ссылку...', { id: 'replace' });
    
    try {
      const response = await fetch(`https://vpn-production-702c.up.railway.app/devices/${deviceId}/replace`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      
      if (response.ok) {
        setDevice({ ...device, configLink: data.configLink });
        toast.success('Ссылка обновлена!', { id: 'replace' });
      }
    } catch (error) {
      toast.error('Ошибка обновления', { id: 'replace' });
    }
  };

  const handleSaveName = async () => {
    if (!deviceId || !deviceName.trim()) return;
    
    try {
      const response = await fetch(`https://vpn-production-702c.up.railway.app/devices/${deviceId}/name`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ customName: deviceName })
      });
      
      if (response.ok) {
        setDevice({ ...device, name: deviceName });
        setIsEditing(false);
        toast.success('Название сохранено');
      }
    } catch (error) {
      toast.error('Ошибка сохранения');
    }
  };

  const handleDeleteClick = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => {
        setConfirmDelete(false);
      }, 5000);
    } else {
      performDelete();
    }
  };

  const performDelete = async () => {
    if (!deviceId || !device || isDeleting) return;
    
    setIsDeleting(true);
    toast.loading('Удаляем устройство...', { id: 'delete-device' });
    
    try {
      const response = await fetch(`https://vpn-production-702c.up.railway.app/devices/${deviceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка при удалении');
      }

      toast.success('Устройство успешно удалено!', { id: 'delete-device' });
      
      setTimeout(() => navigate('/'), 1500);

    } catch (error: any) {
      console.error('❌ Delete error:', error);
      toast.error(error.message || 'Не удалось удалить устройство', { id: 'delete-device' });
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const cancelDelete = () => {
    setConfirmDelete(false);
  };

  // Анимация появления страницы
  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    in: { opacity: 1, x: 0 },
    out: { opacity: 0, x: -20 }
  };

  if (loading) {
    return (
      <div className="deviceDetailPage container">
        <div className="loadingScreen">
          <div className="loadingSpinner"></div>
          <p>Загрузка устройства...</p>
        </div>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="deviceDetailPage container">
        <div className="errorScreen">
          <AlertCircle size={48} />
          <h2>Устройство не найдено</h2>
          <motion.button 
            onClick={() => navigate(-1)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Вернуться назад
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="deviceDetailPage container"
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="deviceDetailHeader">
        <motion.button 
          className="backButton" 
          onClick={() => navigate(-1)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronLeft size={24} />
        </motion.button>
        <h1>Настройки устройства</h1>
      </div>

      {/* Карточка профиля устройства */}
      <motion.div 
        className="deviceProfileCard"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="deviceProfileIcon">
          <Smartphone size={36} />
        </div>
        <div className="deviceProfileInfo">
          {isEditing ? (
            <div className="deviceNameEdit">
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                autoFocus
                onBlur={handleSaveName}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                placeholder="Введите название"
              />
              <motion.button 
                onClick={handleSaveName} 
                className="saveNameBtn"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Check size={16} />
              </motion.button>
            </div>
          ) : (
            <div className="deviceNameDisplay">
              <h2>{device.name}</h2>
              <motion.button 
                onClick={() => setIsEditing(true)} 
                className="editNameBtn"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Edit2 size={14} />
              </motion.button>
            </div>
          )}
          <p className="deviceProfileModel">{device.model || 'VPN Устройство'}</p>
          <div className="deviceProfileStatus">
            <span className={`statusBadge ${device.isActive ? 'active' : 'inactive'}`}>
              {device.isActive ? '● Активно' : '○ Неактивно'}
            </span>
            {device.isActive && (
              <span className="daysBadge">
                <Timer size={14} /> 
                {device.daysLeft || 30} дн.
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Карточка Конфигурации */}
      <motion.div 
        className="configCard"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="configCardTitle">Конфигурация</h3>
        <p className="configCardDescription">
          Скопируйте ссылку и вставьте в приложение HitProxy или HitVPN
        </p>
        
        <div className="configLinkContainer">
          <code className="configLinkCode">{device.configLink}</code>
          <div className="configActions">
            <motion.button 
              className={`copyLinkBtn ${copied ? 'copied' : ''}`} 
              onClick={handleCopy}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Copy size={18} />
              {copied ? 'Скопировано!' : 'Копировать'}
            </motion.button>
            <motion.button 
              className="replaceLinkBtn"
              onClick={handleReplaceLink}
              title="Сгенерировать новую ссылку"
              whileHover={{ scale: 1.05, rotate: 15 }}
              whileTap={{ scale: 0.95, rotate: -15 }}
            >
              <RefreshCw size={18} />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Кнопка удаления */}
      <motion.div 
        className={`deleteCard ${confirmDelete ? 'confirm' : ''} ${isDeleting ? 'deleting' : ''}`} 
        onClick={!isDeleting ? handleDeleteClick : undefined}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        whileHover={{ scale: isDeleting ? 1 : 1.01 }}
        whileTap={{ scale: isDeleting ? 1 : 0.98 }}
      >
        <div className="deleteCardIcon">
          {isDeleting ? (
            <div className="spinner-small" />
          ) : confirmDelete ? (
            <AlertTriangle size={24} />
          ) : (
            <Trash2 size={24} />
          )}
        </div>
        <div className="deleteCardContent">
          <h4>
            {isDeleting ? 'Удаление...' : 
             confirmDelete ? 'Подтвердите удаление' : 
             'Удалить устройство'}
          </h4>
          <p>
            {isDeleting ? 'Пожалуйста, подождите' :
             confirmDelete ? 'Нажмите ещё раз для подтверждения' : 
             'Это действие нельзя отменить'}
          </p>
        </div>
        {confirmDelete && !isDeleting && (
          <motion.button 
            className="cancelDeleteBtn"
            onClick={(e) => {
              e.stopPropagation();
              cancelDelete();
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X size={16} />
          </motion.button>
        )}
      </motion.div>

      <div className="deviceInfoFooter">
        <p>Подключено: {device.date || 'Неизвестно'}</p>
        <p>ID: {deviceId}</p>
      </div>
    </motion.div>
  );
}