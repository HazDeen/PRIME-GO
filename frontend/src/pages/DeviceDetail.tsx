import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ReactComponent as ArrowLeft } from '../assets/icons/arrow-left.svg';
import { ReactComponent as Edit2 } from '../assets/icons/edit-2.svg';
import { ReactComponent as Trash2 } from '../assets/icons/trash-2.svg';
import { ReactComponent as Apple } from '../assets/icons/apple.svg';
import { ReactComponent as Check } from '../assets/icons/check.svg';
import { ReactComponent as AlertCircle } from '../assets/icons/alert-circle.svg';
import { ReactComponent as AlertTriangle } from '../assets/icons/alert-triangle.svg';
import { ReactComponent as Copy } from '../assets/icons/clipboard.svg';
import { ReactComponent as RefreshCw } from '../assets/icons/refresh-cw.svg';

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
      
      // 1. Получаем пользователя, как в useDevices
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        navigate('/');
        return;
      }
      const user = JSON.parse(userStr);

      // 2. Делаем прямой запрос к нашему новому эндпоинту
      const response = await fetch(`https://vpn-production-702c.up.railway.app/devices/user/${user.telegramId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Ошибка сервера');

      const devices = await response.json();
      
      // 3. Ищем конкретное устройство по ID из URL
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

  // ✅ ЗАМЕНА ССЫЛКИ (ТОКЕНА)
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
        toast.success('✅ Ссылка обновлена!', { id: 'replace' });
      }
    } catch (error) {
      toast.error('❌ Ошибка обновления', { id: 'replace' });
    }
  };

  // ✅ СОХРАНЕНИЕ ИМЕНИ
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
        toast.success('✅ Название сохранено');
      }
    } catch (error) {
      toast.error('❌ Ошибка сохранения');
    }
  };

  // ✅ УДАЛЕНИЕ УСТРОЙСТВА ИЗ БД
  const handleDeleteClick = () => {
  if (!confirmDelete) {
    // Первый клик - показываем подтверждение
    setConfirmDelete(true);
    
    // Автоматически сбрасываем через 5 секунд, если не подтвердили
    setTimeout(() => {
      setConfirmDelete(false);
    }, 5000);
  } else {
    // Второй клик - удаляем
    performDelete();
  }
};

// Функция удаления
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

    toast.success('✅ Устройство успешно удалено!', { 
      id: 'delete-device',
      duration: 3000,
      icon: '🗑️'
    });
    
    // Перенаправляем на главную после удаления
    setTimeout(() => navigate('/'), 1500);

  } catch (error: any) {
    console.error('❌ Delete error:', error);
    toast.error(error.message || '❌ Не удалось удалить устройство', { 
      id: 'delete-device' 
    });
  } finally {
    setIsDeleting(false);
    setConfirmDelete(false);
  }
};

// Отмена подтверждения (если нужно)
const cancelDelete = () => {
  setConfirmDelete(false);
};

  if (loading) {
    return (
      <div className="deviceDetailPage">
        <div className="loadingScreen">
          <div className="loadingSpinner"></div>
          <p>Загрузка устройства...</p>
        </div>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="deviceDetailPage">
        <div className="errorScreen">
          <AlertCircle width={48} height={48} />
          <h2>Устройство не найдено</h2>
          <button onClick={() => navigate(-1)}>Вернуться назад</button>
        </div>
      </div>
    );
  }

  return (
    <div className="deviceDetailPage">
      <div className="deviceDetailHeader">
        <button className="backButton" onClick={() => navigate(-1)}>
          <ArrowLeft width={24} height={24} />
        </button>
        <h1>Настройки устройства</h1>
      </div>

      {/* Карточка устройства с редактированием имени */}
      <div className="deviceProfileCard">
        <div className="deviceProfileIcon">
          <Apple width={48} height={48} />
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
              <button onClick={handleSaveName} className="saveNameBtn">
                <Check width={18} height={18} />
              </button>
            </div>
          ) : (
            <div className="deviceNameDisplay">
              <h2>{device.name}</h2>
              <button onClick={() => setIsEditing(true)} className="editNameBtn">
                <Edit2 width={16} height={16} />
              </button>
            </div>
          )}
          <p className="deviceProfileModel">{device.model}</p>
          <div className="deviceProfileStatus">
            <span className={`statusBadge ${device.isActive ? 'active' : 'inactive'}`}>
              {device.isActive ? '● Активно' : '○ Неактивно'}
            </span>
            {device.isActive && (
              <span className="daysBadge">⏳ {device.daysLeft || 30} дн.</span>
            )}
          </div>
        </div>
      </div>

      {/* Блок с ссылкой и кнопкой замены */}
      <div className="configCard">
        <h3 className="configCardTitle">Конфигурация</h3>
        <p className="configCardDescription">
          Скопируйте ссылку и вставьте в приложение HitProxy или HitVPN
        </p>
        
        <div className="configLinkContainer">
          <code className="configLinkCode">{device.configLink}</code>
          <div className="configActions">
            <button 
              className={`copyLinkBtn ${copied ? 'copied' : ''}`} 
              onClick={handleCopy}
            >
              <Copy width={18} height={18} />
              {copied ? 'Скопировано!' : 'Копировать'}
            </button>
            <button 
              className="replaceLinkBtn"
              onClick={handleReplaceLink}
              title="Сгенерировать новую ссылку"
            >
              <RefreshCw width={18} height={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Кнопка удаления с подтверждением */}
<div 
  className={`deleteCard ${confirmDelete ? 'confirm' : ''} ${isDeleting ? 'deleting' : ''}`} 
  onClick={!isDeleting ? handleDeleteClick : undefined}
>
  <div className="deleteCardIcon">
    {isDeleting ? (
      <div className="spinner-small" />
    ) : confirmDelete ? (
      <AlertTriangle width={24} height={24} />
    ) : (
      <Trash2 width={24} height={24} />
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
    <button 
      className="cancelDeleteBtn"
      onClick={(e) => {
        e.stopPropagation();
        cancelDelete();
      }}
    >
      ✕
    </button>
  )}
</div>

      {/* Дополнительная информация */}
      <div className="deviceInfoFooter">
        <p>Подключено: {device.date || '12.02.26'}</p>
        <p>ID: {deviceId}</p>
      </div>
    </div>
  );
}