// GlassIconButton.tsx — Glass icon button primitive
import React from 'react';

interface GlassIconButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  active?: boolean;
  expanded?: boolean;
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
  expanded,
  size = 'md',
  label,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    aria-expanded={expanded}
    title={label}
    className={`
      glass-icon-button focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine-teal
      ${sizeStyles[size]}
      ${active ? `
        border-none bg-primary-gradient text-white
        hover:bg-primary-hover-gradient
      ` : ''}
      ${className}
    `}
  >
    {children}
  </button>
);
