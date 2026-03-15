import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2 } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { toast } from 'sonner'; // 👈 ДОБАВИЛИ ИМПОРТ УВЕДОМЛЕНИЙ

interface Props {
  currentAvatar?: string | null;
  username: string;
  onUpload: (base64: string) => Promise<void>;
  size?: number;
}

export default function AvatarUploader({ currentAvatar, username, onUpload, size = 72 }: Props) {
  const [showPencil, setShowPencil] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getFirstLetter = () => username ? username.charAt(0).toUpperCase() : '?';

  // Логика кликов (1 раз - карандаш, 2 раз - выбор файла)
  const handleAvatarClick = () => {
    if (!showPencil) {
      setShowPencil(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setShowPencil(false), 5000);
    } else {
      fileInputRef.current?.click();
      setShowPencil(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => setImageToCrop(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Функция для вырезания картинки через Canvas
  const createCroppedImage = async (): Promise<string> => {
    const image = new Image();
    image.src = imageToCrop!;
    await new Promise(resolve => image.onload = resolve);

    const canvas = document.createElement('canvas');
    canvas.width = 200; // Фиксированный размер аватарки (компактный)
    canvas.height = 200;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(
        image,
        croppedAreaPixels.x, croppedAreaPixels.y,
        croppedAreaPixels.width, croppedAreaPixels.height,
        0, 0, 200, 200
      );
    }
    // Конвертируем в WEBP для минимального веса (около 3-15кб)
    return canvas.toDataURL('image/webp', 0.8);
  };

  const handleSaveCrop = async () => {
    // Защита от слишком быстрого клика
    if (!croppedAreaPixels) {
      toast.error('Подождите, фото еще обрабатывается...');
      return;
    }

    setIsUploading(true);
    try {
      const base64Image = await createCroppedImage();
      await onUpload(base64Image); // Отправляем на сервер
      setImageToCrop(null); // Если всё ок - закрываем модалку
    } catch (e: any) {
      console.error(e);
      // 👈 ТЕПЕРЬ МЫ УВИДИМ ОШИБКУ НА ЭКРАНЕ
      toast.error(e.message || 'Ошибка при сохранении фото на сервере');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div 
        onClick={handleAvatarClick}
        style={{
          width: size, height: size, borderRadius: '24px', cursor: 'pointer',
          position: 'relative', overflow: 'hidden', flexShrink: 0,
          background: currentAvatar ? 'transparent' : 'var(--text-primary)',
          color: 'var(--bg-primary)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
        }}
      >
        {currentAvatar ? (
          <img src={currentAvatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: size * 0.4, fontWeight: 700 }}>{getFirstLetter()}</span>
        )}

        {/* Анимация карандаша поверх */}
        <AnimatePresence>
          {showPencil && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                backdropFilter: 'blur(2px)'
              }}
            >
              <Edit2 size={size * 0.4} />
            </motion.div>
          )}
        </AnimatePresence>

        <input type="file" ref={fileInputRef} onChange={onFileChange} accept="image/*" style={{ display: 'none' }} />
      </div>

    {createPortal(
      <AnimatePresence>
        {imageToCrop && (
          <div className="modalOverlay center" style={{ zIndex: 2000 }}>
            <motion.div 
              className="confirmModal"
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            >
              <h3 className="modalTitle" style={{ marginBottom: '20px' }}>Обрезка фото</h3>
              
              <div style={{ position: 'relative', width: '100%', height: '300px', background: '#000', borderRadius: '20px', overflow: 'hidden', marginBottom: '20px' }}>
                <Cropper
                  image={imageToCrop}
                  crop={crop}
                  zoom={zoom}
                  aspect={1} // Строго квадрат
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>

              <input 
                type="range" min={1} max={3} step={0.1} value={zoom} 
                onChange={(e) => setZoom(Number(e.target.value))} 
                style={{ width: '100%', marginBottom: '24px' }}
              />

              <div className="modalBtnGroup">
                <button className="modalBtn secondary" onClick={() => setImageToCrop(null)} disabled={isUploading}>Отмена</button>
                <button className="modalBtn primary" onClick={handleSaveCrop} disabled={isUploading}>
                  {isUploading ? 'Сохранение...' : 'Готово'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
      )}
    </>
  );
}