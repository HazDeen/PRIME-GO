import { motion } from 'framer-motion';
import { Settings, ShieldAlert } from 'lucide-react';
import '../styles/login.css'; // Используем те же стили центрирования

export default function Maintenance() {
  return (
    <div className="loginPage">
      <div className="loginContainer">
        <motion.div 
          className="loginCard"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
          style={{ textAlign: 'center', padding: '50px 30px' }}
        >
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
            style={{ display: 'inline-block', marginBottom: '20px', color: 'var(--text-primary)' }}
          >
            <Settings size={64} strokeWidth={1.5} />
          </motion.div>
          
          <h1 className="loginTitle" style={{ fontSize: '28px', marginBottom: '12px' }}>
            Технические работы
          </h1>
          
          <p className="loginDescription" style={{ fontSize: '15px', lineHeight: '1.6' }}>
            Прямо сейчас мы обновляем сервера, чтобы VPN работал еще быстрее и стабильнее. 
            <br/><br/>
            Пожалуйста, возвращайтесь немного позже! 🚀
          </p>

          <div className="loginFooter" style={{ marginTop: '30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--warning)' }}>
              <ShieldAlert size={18} />
              <span style={{ fontWeight: 600 }}>Ваши данные и подписки в безопасности</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}