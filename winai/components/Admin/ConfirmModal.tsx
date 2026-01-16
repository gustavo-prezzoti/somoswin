import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'danger',
    onConfirm,
    onCancel
}) => {
    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            icon: 'bg-rose-100 text-rose-600',
            button: 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/30'
        },
        warning: {
            icon: 'bg-amber-100 text-amber-600',
            button: 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/30'
        },
        info: {
            icon: 'bg-blue-100 text-blue-600',
            button: 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'
        }
    };

    const styles = variantStyles[variant];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl ${styles.icon}`}>
                            <AlertTriangle size={24} />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <h3 className="font-black text-gray-800 text-lg">{title}</h3>
                                <button
                                    onClick={onCancel}
                                    className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <p className="text-gray-500 text-sm mt-2 leading-relaxed">{message}</p>
                        </div>
                    </div>
                </div>

                <div className="px-6 pb-6 flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-5 py-2.5 rounded-xl font-bold text-white transition-colors shadow-lg ${styles.button}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
