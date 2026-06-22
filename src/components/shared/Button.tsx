// Button.tsx - Reusable button primitive
import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  className?: string;
}

const variantMap: Record<ButtonVariant, string> = {
  primary:
    'rounded-3xl border-none bg-primary-gradient text-text-inv shadow-button hover:bg-primary-hover-gradient',
  secondary:
    'rounded-3xl border border-border-card bg-surface-card text-text-main hover:border-text-muted hover:bg-surface-hover',
  ghost:
    'rounded-3xl border-none bg-transparent text-text-muted hover:bg-surface-hover hover:text-text-main',
};

const sizeMap: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-6 py-3 text-[15px]',
  lg: 'px-8 py-4 text-base',
};

/**
 * Reusable button component that encapsulates the common button styles.
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  ...rest
}) => (
  <button
    type="button"
    disabled={disabled}
    className={`
      inline-flex cursor-pointer items-center justify-center gap-2 font-main
      font-semibold transition-smooth
      active:scale-[0.98]
      disabled:cursor-not-allowed disabled:opacity-50
      ${variantMap[variant]}
      ${sizeMap[size]}
      ${className}
    `}
    {...rest}
  >
    {children}
  </button>
);
