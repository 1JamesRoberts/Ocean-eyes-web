// GlassButton.tsx — Unified glass button primitive
import React from 'react';

type GlassVariant = 'primary' | 'outline' | 'danger';
type GlassSize = 'sm' | 'md' | 'lg';

interface GlassButtonProps {
  children: React.ReactNode;
  variant: GlassVariant;
  size?: GlassSize;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
  'aria-label'?: string;
  'aria-expanded'?: boolean;
}

const variantStyles: Record<GlassVariant, string> = {
  primary: 'glass-button-primary text-white',
  outline: 'glass-button-outline',
  danger: `
    inline-flex items-center justify-center gap-2 cursor-pointer
    border border-solid border-critical/30 bg-critical/8
    rounded-3xl type-strong text-critical
    transition-smooth whitespace-nowrap
    hover:bg-critical/15
  `,
};

const sizeStyles: Record<GlassSize, string> = {
  sm: 'px-3 py-1.5 type-caption',
  md: 'px-5 py-2.5 type-strong',
  lg: 'px-6 py-3.5 type-title',
};

export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  variant,
  size = 'md',
  className = '',
  onClick,
  type = 'button',
  fullWidth = false,
  'aria-label': ariaLabel,
  'aria-expanded': ariaExpanded,
}) => (
  <button
    type={type}
    onClick={onClick}
    aria-label={ariaLabel}
    aria-expanded={ariaExpanded}
    className={`
      min-h-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus
      ${variantStyles[variant]}
      ${sizeStyles[size]}
      ${fullWidth ? 'w-full' : ''}
      ${className}
    `}
  >
    {children}
  </button>
);
