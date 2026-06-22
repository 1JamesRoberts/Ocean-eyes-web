// DashboardCard.tsx - Reusable card wrapper for dashboard panels
// Now wraps GlassCard for aquatic glass consistency.
import React from 'react';
import { GlassCard } from './GlassCard';

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
 * Reusable card component that wraps GlassCard with a compact padding.
 * Provides a consistent look across all dashboard panels.
 */
export const DashboardCard: React.FC<DashboardCardProps> = ({
  children,
  className = '',
  ...rest
}) => (
  <GlassCard className={`
    p-5
    ${className}
  `} {...rest}>
    {children}
  </GlassCard>
);
