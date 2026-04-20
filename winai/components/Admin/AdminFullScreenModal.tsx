import React from 'react';
import {
    ADMIN_MODAL_BACKDROP_BLUR,
    ADMIN_MODAL_BACKDROP_DEFAULT,
    ADMIN_MODAL_INNER,
} from './adminModalStack';

export interface AdminFullScreenModalProps {
    children: React.ReactNode;
    /** default = escuro simples; blur = backdrop-blur (dashboard individual). */
    backdrop?: 'default' | 'blur';
    onBackdropClick?: () => void;
    className?: string;
    innerClassName?: string;
}

/**
 * Overlay full-screen acima do sidebar (z-1100): scroll no backdrop, painel sem margem vertical extra.
 */
const AdminFullScreenModal: React.FC<AdminFullScreenModalProps> = ({
    children,
    backdrop = 'default',
    onBackdropClick,
    className = '',
    innerClassName = '',
}) => {
    const root =
        backdrop === 'blur' ? `${ADMIN_MODAL_BACKDROP_BLUR} ${className}`.trim() : `${ADMIN_MODAL_BACKDROP_DEFAULT} ${className}`.trim();

    return (
        <div
            className={root}
            role="presentation"
            onClick={
                onBackdropClick
                    ? (e) => {
                          if (e.target === e.currentTarget) onBackdropClick();
                      }
                    : undefined
            }
        >
            <div className={`${ADMIN_MODAL_INNER} ${innerClassName}`.trim()}>{children}</div>
        </div>
    );
};

export default AdminFullScreenModal;
