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
  sm: 'size-11 text-sm',
  md: 'size-11 text-base',
  lg: 'size-12 text-lg',
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
      glass-icon-button focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand
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
