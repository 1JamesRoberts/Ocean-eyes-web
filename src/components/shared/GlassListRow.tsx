// GlassListRow.tsx — Reusable translucent list row
import React from 'react';

interface GlassListRowProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  leftBorder?: 'critical' | 'warning' | 'good' | 'info' | 'none';
}

const borderStyles = {
  critical: 'border-l-4 border-l-critical',
  warning: 'border-l-4 border-l-warning',
  good: 'border-l-4 border-l-good',
  info: 'border-l-4 border-l-info',
  none: '',
};

export const GlassListRow: React.FC<GlassListRowProps> = ({
  children,
  className = '',
  onClick,
  leftBorder = 'none',
}) => (
  <div
    className={`
      flex items-center justify-between rounded-full border border-white/20
      bg-white/20 p-4 transition-colors
      hover:bg-white/40
      ${onClick ? 'cursor-pointer' : ''}
      ${borderStyles[leftBorder]}
      ${className}
    `}
    onClick={onClick}
  >
    {children}
  </div>
);
