// GlassIconButton.tsx — Glass icon button primitive
import React from 'react';

interface GlassIconButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  active?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label: string;
}

const sizeStyles = {
  sm: 'p-1.5 text-sm',
  md: 'p-2.5 text-base',
  lg: 'p-3 text-lg',
};

export const GlassIconButton: React.FC<GlassIconButtonProps> = ({
  children,
  onClick,
  className = '',
  active = false,
  size = 'md',
  label,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className={`
      glass-icon-button
      ${sizeStyles[size]}
      ${active ? `
        border-none bg-primary-gradient text-text-inverse
        hover:bg-primary-hover-gradient
      ` : ''}
      ${className}
    `}
  >
    {children}
  </button>
);
