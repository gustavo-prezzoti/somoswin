import React from 'react';
import { AlertTriangle } from 'lucide-react';
import './ConfirmModal.css';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant?: 'danger' | 'warning' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    onConfirm,
    onCancel,
    variant = 'danger'
}) => {
    if (!isOpen) return null;

    return (
        <div className="confirm-modal-overlay" onClick={onCancel}>
            <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className={`confirm-modal-icon ${variant}`}>
                    <AlertTriangle size={48} />
                </div>
                <h2 className="confirm-modal-title">{title}</h2>
                <p className="confirm-modal-message">{message}</p>

                <div className="confirm-modal-actions">
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={onCancel}
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        className={`btn-${variant}`}
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
