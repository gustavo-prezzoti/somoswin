import React, { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const ToastComponent: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const icons = {
    success: <CheckCircle size={20} className="text-emerald-600" />,
    error: <XCircle size={20} className="text-rose-600" />,
    info: <CheckCircle size={20} className="text-blue-600" />
  };

  const bgColors = {
    success: 'bg-emerald-50 border-emerald-200',
    error: 'bg-rose-50 border-rose-200',
    info: 'bg-blue-50 border-blue-200'
  };

  const textColors = {
    success: 'text-emerald-800',
    error: 'text-rose-800',
    info: 'text-blue-800'
  };

  return (
    <div
      className={`${bgColors[toast.type]} ${textColors[toast.type]} border rounded-xl shadow-lg p-4 flex items-center gap-3 min-w-[300px] max-w-[500px] animate-in slide-in-from-right-4 duration-300`}
    >
      {icons[toast.type]}
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => onClose(toast.id)}
        className={`${textColors[toast.type]} hover:opacity-70 transition-opacity`}
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default ToastComponent;

