// GlassModal.tsx — Glass modal with scrim overlay
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  placement?: 'center' | 'bottom' | 'below-hero';
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
  const contentRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!isOpen) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const scrollContainer = document.querySelector<HTMLElement>('[data-mobile-screen-scroll]');
    const previousOverflow = scrollContainer?.style.overflow;
    if (scrollContainer) scrollContainer.style.overflow = 'hidden';

    const getFocusableElements = () => Array.from(
      contentRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    );

    const focusableElements = getFocusableElements();
    (focusableElements[0] ?? contentRef.current)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const elements = getFocusableElements();
      if (elements.length === 0) {
        event.preventDefault();
        contentRef.current?.focus();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (scrollContainer) scrollContainer.style.overflow = previousOverflow ?? '';
      restoreFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isBottomSheet = placement === 'bottom' || placement === 'below-hero';
  const isBelowHero = placement === 'below-hero';
  // The hero's scroll layer uses clip-path for its stationary rounded transition.
  // Render this sheet beside that layer so the clip cannot trim its top or sides.
  const phoneFrame = isBelowHero
    ? document.querySelector<HTMLElement>('.phone-frame')
    : null;

  const modal = (
    <div
      className={`
        ${isBelowHero ? 'absolute z-50' : 'fixed z-[70]'} right-0 bottom-0 left-0 flex justify-center
        ${isBelowHero
          ? 'top-[calc(var(--mobile-status-bar-height)+var(--mobile-hero-height))]'
          : 'top-0'
        }
        ${isBottomSheet ? 'items-end p-0' : 'items-center p-4'}
      `}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      {/* Scrim */}
      <div
        className={`
          absolute inset-0 bg-[rgba(15,23,42,0.5)] backdrop-blur-xs
          ${isBelowHero ? 'motion-safe:animate-sheet-backdrop' : ''}
        `}
      />

      {/* Content */}
      <div
        ref={contentRef}
        tabIndex={-1}
        className={`
          relative z-10 w-full glass-card
          ${isBottomSheet
            ? `
              max-w-none overflow-hidden
              rounded-t-[28px]! rounded-b-none! p-0
              ${isBelowHero ? 'h-full motion-safe:animate-sheet-enter' : 'max-h-[85dvh]'}
            `
            : 'max-w-md p-6 pb-5'
          }
          ${className}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );

  return phoneFrame ? createPortal(modal, phoneFrame) : modal;
};
