import React from 'react';
import { createPortal } from 'react-dom';

/**
 * Renderiza em document.body para que position:fixed use a viewport inteira
 * (evita ancoragem em main com overflow-y-auto ou ancestrais com transform).
 */
export const BodyPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (typeof document === 'undefined') {
    return null;
  }
  return createPortal(children, document.body);
};
