// DashboardCard.tsx - Reusable card wrapper for dashboard panels
import React from 'react';

interface DashboardCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  role?: string;
  tabIndex?: number;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  style?: React.CSSProperties;
}

/**
 * Reusable card component that encapsulates the common dashboard card styling.
 * Provides a consistent look across all dashboard panels.
 */
export const DashboardCard: React.FC<DashboardCardProps> = ({
  children,
  className = '',
  ...rest
}) => (
  <div
    className={`
      rounded-[20px] border border-border-subtle bg-surface-card p-5 shadow-card
      transition-smooth
      ${className}
    `}
    {...rest}
  >
    {children}
  </div>
);
