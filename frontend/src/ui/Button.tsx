// ui/Button.tsx
import type { ReactNode } from "react";
import { Plus, X, ArrowDownCircle, RefreshCw } from "lucide-react";

type Props = {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  fullWidth?: boolean;
  icon?: "plus" | "x" | "topup" | "replace" | null;
};

export default function Button({
  children,
  onClick,
  variant = "secondary",
  fullWidth = false,
  icon = null,
}: Props) {
  const renderIcon = () => {
    switch (icon) {
      case "plus":
        return <Plus size={18} />;
      case "x":
        return <X size={18} />;
      case "topup":
        return <ArrowDownCircle size={18} />;
      case "replace":
        return <RefreshCw size={18} />;
      default:
        return null;
    }
  };

  return (
    <button 
      className={`uiBtn ${variant} ${fullWidth ? 'fullWidth' : ''}`} 
      onClick={onClick}
    >
      {renderIcon()}
      {children}
    </button>
  );
}