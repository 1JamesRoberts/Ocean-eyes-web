// GlassModal.tsx — Glass modal with scrim overlay
import React, { useEffect, useRef } from 'react';

interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  placement?: 'center' | 'bottom';
  labelledBy?: string;
}

export const GlassModal: React.FC<GlassModalProps> = ({
  isOpen,
  onClose,
  children,
  className = '',
  placement = 'center',
  labelledBy,
}) => {
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const scrollContainer = document.querySelector<HTMLElement>('.phone-content');
    const previousOverflow = scrollContainer?.style.overflow;
    if (scrollContainer) scrollContainer.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (scrollContainer) scrollContainer.style.overflow = previousOverflow ?? '';
      restoreFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isBottomSheet = placement === 'bottom';

  return (
    <div
      className={`
        fixed inset-0 z-[70] flex justify-center
        ${isBottomSheet ? 'items-end p-0' : 'items-center p-4'}
      `}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      {/* Scrim */}
      <div className="absolute inset-0 bg-[rgba(15,23,42,0.5)] backdrop-blur-xs" />

      {/* Content */}
      <div
        className={`
          relative z-10 w-full glass-card
          ${isBottomSheet
            ? `
              max-h-[85dvh] max-w-(--mobile-frame-width) overflow-hidden
              rounded-t-[28px]! rounded-b-none! p-0
            `
            : 'max-w-md p-6'
          }
          ${className}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};
