import React from 'react';
import { X, Loader2 } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
    size = 'lg'
}) => {
    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-3xl',
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-emerald-950/20 backdrop-blur-sm">
            <div className={`bg-white w-full ${sizeClasses[size]} rounded-3xl shadow-2xl border border-emerald-800/10 max-h-[90vh] flex flex-col`}>
                {/* Header fixo */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
                    <div className="space-y-0.5">
                        {subtitle && (
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em]">{subtitle}</span>
                        )}
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">{title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                {/* Conteúdo com scroll */}
                <div className="p-6 overflow-y-auto flex-1">
                    {children}
                </div>
            </div>
        </div>
    );
};

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'default';
    isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    variant = 'default',
    isLoading = false,
}) => {
    if (!isOpen) return null;

    const variantStyles = {
        danger: 'bg-red-600 hover:bg-red-700 shadow-red-600/20',
        warning: 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20',
        default: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20',
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-emerald-950/30 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden border border-gray-100">
                <div className="p-8 space-y-6">
                    <div className="text-center space-y-2">
                        <h3 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic">{title}</h3>
                        <p className="text-gray-500 font-medium">{message}</p>
                    </div>

                    <div className="flex gap-4 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 px-6 py-4 border border-gray-100 text-gray-400 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-gray-50 transition-all disabled:opacity-50"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`flex-1 px-6 py-4 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${variantStyles[variant]}`}
                        >
                            {isLoading ? <Loader2 size={18} className="animate-spin" /> : confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Modal;
