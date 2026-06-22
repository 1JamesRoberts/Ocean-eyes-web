// Modal.tsx - Reusable modal shell
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  closeOnBackdropClick?: boolean;
}

/**
 * Reusable modal component with a consistent backdrop and container style.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  footer,
  className = '',
  closeOnBackdropClick = true,
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && closeOnBackdropClick) {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="
        fixed inset-0 z-1000 flex animate-fade-in items-center justify-center
        bg-[rgba(15,23,42,0.6)] p-4 backdrop-blur-xs
      "
      onClick={handleBackdropClick}
    >
      <div
        className={`
          w-full max-w-lg animate-slide-up rounded-card border
          border-border-card-dim bg-surface-card p-6 shadow-premium
          ${className}
        `}
      >
        {title && (
          <div className="mb-5">
            {typeof title === 'string' ? (
              <h2 className="text-xl font-bold text-text-main">{title}</h2>
            ) : (
              title
            )}
          </div>
        )}
        {children}
        {footer && <div className="mt-6 flex items-center justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
};
