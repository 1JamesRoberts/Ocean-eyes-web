// DashboardCard.tsx - Reusable card wrapper for dashboard panels
import React from 'react';

export type DashboardCardVariant = 'default' | 'hoverable';
export type DashboardCardPadding = 'compact' | 'default' | 'loose';

interface DashboardCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: DashboardCardVariant;
  padding?: DashboardCardPadding;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  onClick?: () => void;
  role?: string;
  tabIndex?: number;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  style?: React.CSSProperties;
}

const paddingMap: Record<DashboardCardPadding, string> = {
  compact: 'p-4',
  default: 'p-5',
  loose: 'p-6',
};

/**
 * Reusable card component that encapsulates the common dashboard card styling.
 * Provides a consistent look across all dashboard panels.
 */
export const DashboardCard: React.FC<DashboardCardProps> = ({
  children,
  className = '',
  variant = 'default',
  padding = 'default',
  header,
  footer,
  ...rest
}) => {
  const hoverClasses =
    variant === 'hoverable'
      ? 'hover:-translate-y-px hover:border-border-card-dim-hover hover:shadow-card-hover'
      : '';

  return (
    <div
      className={`
        rounded-card border border-border-card-dim bg-surface-card
        ${paddingMap[padding]}
        shadow-card transition-smooth
        ${hoverClasses}
        ${className}
      `}
      {...rest}
    >
      {header && <div className="mb-4">{header}</div>}
      {children}
      {footer && <div className="mt-4">{footer}</div>}
    </div>
  );
};
