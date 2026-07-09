// GlassButton.tsx — Unified glass button primitive
import React from 'react';

type GlassVariant = 'default' | 'primary' | 'outline' | 'danger' | 'ghost';
type GlassSize = 'sm' | 'md' | 'lg';

interface GlassButtonProps {
  children: React.ReactNode;
  variant?: GlassVariant;
  size?: GlassSize;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<GlassVariant, string> = {
  default: 'glass-button',
  primary: 'glass-button-primary',
  outline: 'glass-button-outline',
  danger: `
    inline-flex items-center justify-center gap-2 cursor-pointer
    border border-solid border-critical/30 bg-critical/8
    rounded-3xl type-strong text-critical
    transition-smooth whitespace-nowrap
    hover:bg-critical/15 active:scale-[0.98]
  `,
  ghost: `
    inline-flex items-center justify-center gap-2 cursor-pointer
    border-none bg-transparent rounded-3xl
    type-strong text-text-muted
    transition-smooth whitespace-nowrap
    hover:text-brand active:scale-[0.98]
  `,
};

const sizeStyles: Record<GlassSize, string> = {
  sm: 'px-3 py-1.5 type-caption',
  md: 'px-5 py-2.5 type-strong',
  lg: 'px-6 py-3.5 type-title',
};

const disabledStyles = 'opacity-50 pointer-events-none';

export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  onClick,
  type = 'button',
  disabled = false,
  fullWidth = false,
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`
      ${variantStyles[variant]}
      ${sizeStyles[size]}
      ${fullWidth ? 'w-full' : ''}
      ${disabled ? disabledStyles : ''}
      ${className}
    `}
  >
    {children}
  </button>
);
