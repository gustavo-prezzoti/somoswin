import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle2, Info, X, Loader2, AlertTriangle, Trash2 } from 'lucide-react';

type ModalType = 'alert' | 'confirm' | 'success' | 'error' | 'warning' | 'danger';

interface ModalOptions {
    title: string;
    message?: string;
    type?: ModalType;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void | Promise<void>;
    onCancel?: () => void;
    body?: React.ReactNode;
    showFooter?: boolean;
}

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
}

interface ModalContextType {
    showAlert: (title: string, message: string, type?: ModalType) => void;
    showConfirm: (options: ModalOptions) => void;
    showCustomModal: (options: ModalOptions) => void;
    showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
    closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [modalStack, setModalStack] = useState<ModalOptions[]>([]);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const showAlert = useCallback((title: string, message: string, type: ModalType = 'alert') => {
        setModalStack(prev => [...prev, { title, message, type, confirmText: 'Entendido', showFooter: true }]);
    }, []);

    const showConfirm = useCallback((options: ModalOptions) => {
        setModalStack(prev => [...prev, { ...options, type: options.type || 'confirm', showFooter: options.showFooter ?? true }]);
    }, []);

    const showCustomModal = useCallback((options: ModalOptions) => {
        setModalStack(prev => [...prev, { ...options, showFooter: options.showFooter ?? false }]);
    }, []);

    const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    const closeModal = useCallback(() => {
        setModalStack(prev => prev.slice(0, -1));
        setIsLoading(false);
    }, []);

    const handleConfirm = async (currentModal: ModalOptions) => {
        if (currentModal.onConfirm) {
            try {
                setIsLoading(true);
                await currentModal.onConfirm();
                closeModal();
            } catch (error) {
                console.error('Modal action failed:', error);
            } finally {
                setIsLoading(false);
            }
        } else {
            closeModal();
        }
    };

    const currentModal = modalStack[modalStack.length - 1];

    const getIcon = (type?: ModalType) => {
        switch (type) {
            case 'success': return <CheckCircle2 size={28} />;
            case 'error': return <AlertCircle size={28} />;
            case 'danger': return <Trash2 size={28} />;
            case 'warning': return <AlertTriangle size={28} />;
            case 'confirm': return <AlertTriangle size={28} />;
            default: return <Info size={28} />;
        }
    };

    const getIconStyles = (type?: ModalType) => {
        switch (type) {
            case 'success': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'error': return 'bg-rose-50 text-rose-600 border-rose-100';
            case 'danger': return 'bg-rose-50 text-rose-600 border-rose-100';
            case 'warning': return 'bg-amber-50 text-amber-600 border-amber-100';
            case 'confirm': return 'bg-amber-50 text-amber-600 border-amber-100';
            default: return 'bg-indigo-50 text-indigo-600 border-indigo-100';
        }
    };

    const getButtonStyles = (type?: ModalType) => {
        switch (type) {
            case 'success': return 'bg-emerald-600 hover:bg-emerald-700';
            case 'error': case 'danger': return 'bg-rose-600 hover:bg-rose-700';
            case 'warning': case 'confirm': return 'bg-amber-600 hover:bg-amber-700';
            default: return 'bg-gray-900 hover:bg-black';
        }
    };

    return (
        <ModalContext.Provider value={{ showAlert, showConfirm, showCustomModal, showToast, closeModal }}>
            {children}

            {/* Toasts Container */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[10000] flex flex-col gap-3 pointer-events-none">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-auto bg-white 
                            ${toast.type === 'success' ? 'border-emerald-100 text-emerald-800' :
                                toast.type === 'error' ? 'border-rose-100 text-rose-800' :
                                    toast.type === 'warning' ? 'border-amber-100 text-amber-800' :
                                        'border-indigo-100 text-indigo-800'}`}
                    >
                        {toast.type === 'success' && <CheckCircle2 size={18} className="text-emerald-500" />}
                        {toast.type === 'error' && <AlertCircle size={18} className="text-rose-500" />}
                        {toast.type === 'warning' && <AlertTriangle size={18} className="text-amber-500" />}
                        {toast.type === 'info' && <Info size={18} className="text-indigo-500" />}
                        <span className="text-[11px] font-black uppercase tracking-widest">{toast.message}</span>
                    </div>
                ))}
            </div>

            {currentModal && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/40 animate-in fade-in duration-200"
                    onClick={(e) => {
                        if (e.target === e.currentTarget && !isLoading) {
                            if (currentModal.onCancel) currentModal.onCancel();
                            closeModal();
                        }
                    }}
                >
                    <div className="bg-white rounded-[2rem] w-full max-w-3xl shadow-xl overflow-y-auto max-h-[90vh] animate-in zoom-in-95 slide-in-from-bottom-2 duration-200 border border-gray-100 flex flex-col">
                        {/* Header */}
                        <div className="p-8 pb-6">
                            <div className="flex items-start gap-5">
                                {!currentModal.body && (
                                    <div className={`p-4 rounded-2xl border ${getIconStyles(currentModal.type)}`}>
                                        {getIcon(currentModal.type)}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start gap-4">
                                        <h3 className="font-black text-gray-900 text-xl uppercase tracking-tighter italic leading-tight">
                                            {currentModal.title}
                                        </h3>
                                        {!currentModal.body && (
                                            <button
                                                onClick={() => {
                                                    if (currentModal.onCancel) currentModal.onCancel();
                                                    closeModal();
                                                }}
                                                disabled={isLoading}
                                                className="p-2 text-gray-300 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all shrink-0 disabled:opacity-50"
                                            >
                                                <X size={20} strokeWidth={2.5} />
                                            </button>
                                        )}
                                    </div>
                                    {currentModal.message && (
                                        <p className="text-gray-500 text-sm mt-3 leading-relaxed font-bold italic">
                                            {currentModal.message}
                                        </p>
                                    )}

                                    {currentModal.body && (
                                        <div className="mt-6">
                                            {currentModal.body}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        {currentModal.showFooter && (
                            <div className="px-8 pb-8 flex flex-col sm:flex-row justify-end gap-3">
                                {(currentModal.type === 'confirm' || currentModal.type === 'danger' || currentModal.type === 'warning') && (
                                    <button
                                        onClick={() => {
                                            if (currentModal.onCancel) currentModal.onCancel();
                                            closeModal();
                                        }}
                                        disabled={isLoading}
                                        className="w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-100 transition-all uppercase text-[10px] tracking-[0.2em] disabled:opacity-50 active:scale-95"
                                    >
                                        {currentModal.cancelText || 'Cancelar'}
                                    </button>
                                )}
                                <button
                                    onClick={() => handleConfirm(currentModal)}
                                    disabled={isLoading}
                                    className={`w-full sm:w-auto px-10 py-4 rounded-2xl font-black text-white transition-all shadow-lg uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 ${getButtonStyles(currentModal.type)}`}
                                >
                                    {isLoading && <Loader2 size={16} className="animate-spin" />}
                                    {currentModal.confirmText || (currentModal.type === 'confirm' || currentModal.type === 'danger' || currentModal.type === 'warning' ? 'Confirmar' : 'Entendido')}
                                </button>
                            </div>
                        )}

                        {/* Stack Indicator */}
                        {modalStack.length > 1 && (
                            <div className="bg-gray-50 px-8 py-3 border-t border-gray-100 flex justify-center gap-2">
                                {modalStack.map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-1.5 rounded-full transition-all ${i === modalStack.length - 1 ? 'w-6 bg-emerald-500' : 'w-1.5 bg-gray-200'}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </ModalContext.Provider>
    );
};

export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context) throw new Error('useModal must be used within a ModalProvider');
    return context;
};
