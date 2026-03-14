import { Toaster } from 'sonner';
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Info, 
  AlertTriangle 
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const Toast = () => {
  const { theme } = useTheme(); // Получаем текущую тему!

  return (
    <Toaster
      theme={theme} // 🔥 МАГИЯ ЗДЕСЬ: Sonner теперь знает о нашей теме
      position="bottom-center"
      toastOptions={{
        duration: 3000,
        className: 'premium-toast',
      }}
      icons={{
        success: <CheckCircle2 size={20} color="var(--success)" />,
        error: <XCircle size={20} color="var(--danger)" />,
        loading: <Loader2 size={20} className="toast-spinner" color="var(--text-primary)" />,
        info: <Info size={20} color="var(--accent)" />,
        warning: <AlertTriangle size={20} color="var(--warning)" />,
      }}
    />
  );
};

export { toast } from 'sonner';