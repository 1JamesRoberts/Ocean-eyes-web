// GlassButton.tsx — Unified glass button primitive
import React from 'react';

type GlassVariant = 'default' | 'primary' | 'outline' | 'danger' | 'ghost';
type GlassSize = 'sm' | 'md' | 'lg';

interface GlassButtonProps {
  children: React.ReactNode;
  variant?: GlassVariant;
  size?: GlassSize;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  fullWidth?: boolean;
  'aria-label'?: string;
  'aria-expanded'?: boolean;
}

const variantStyles: Record<GlassVariant, string> = {
  default: 'glass-button',
  primary: 'glass-button-primary text-white',
  outline: 'glass-button-outline',
  danger: `
    inline-flex items-center justify-center gap-2 cursor-pointer
    border border-solid border-critical/30 bg-critical/8
    rounded-3xl type-strong text-critical
    transition-smooth whitespace-nowrap
    hover:bg-critical/15
  `,
  ghost: `
    inline-flex items-center justify-center gap-2 cursor-pointer
    border-none bg-transparent rounded-3xl
    type-strong text-slate-grey
    transition-smooth whitespace-nowrap
    hover:text-accent-ink
  `,
};

const sizeStyles: Record<GlassSize, string> = {
  sm: 'px-3 py-1.5 type-caption',
  md: 'px-5 py-2.5 type-strong',
  lg: 'px-6 py-3.5 type-title',
};

const disabledStyles = 'cursor-not-allowed opacity-50';

export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  onClick,
  type = 'button',
  disabled = false,
  fullWidth = false,
  'aria-label': ariaLabel,
  'aria-expanded': ariaExpanded,
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
    aria-expanded={ariaExpanded}
    className={`
      min-h-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus
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
