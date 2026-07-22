// GlassIconButton.tsx — Glass icon button primitive
import React from 'react';

interface GlassIconButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  label: string;
}

export const GlassIconButton: React.FC<GlassIconButtonProps> = ({
  children,
  onClick,
  className = '',
  label,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className={`
      glass-icon-button size-11 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus
      ${className}
    `}
  >
    {children}
  </button>
);
