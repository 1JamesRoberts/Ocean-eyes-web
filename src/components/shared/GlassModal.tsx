// GlassModal.tsx — Glass modal with scrim overlay
import React from 'react';

interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export const GlassModal: React.FC<GlassModalProps> = ({
  isOpen,
  onClose,
  children,
  className = '',
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Scrim */}
      <div className="absolute inset-0 bg-[rgba(15,23,42,0.5)] backdrop-blur-xs" />

      {/* Content */}
      <div
        className={`
          relative z-10 w-full max-w-md glass-card p-6
          ${className}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};
