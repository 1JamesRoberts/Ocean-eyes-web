// GlassBadge.tsx — Translucent glass badge/chip primitive
import React from 'react';

type BadgeColor = 'good' | 'warning' | 'critical' | 'info' | 'neutral' | 'live';

interface GlassBadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
  className?: string;
  dot?: boolean;
}

const colorStyles: Record<BadgeColor, string> = {
  good: 'bg-good/10 text-good',
  warning: 'bg-warning/10 text-warning',
  critical: 'bg-critical/12 text-critical',
  info: 'bg-info/10 text-info',
  neutral: 'bg-brand/10 text-brand',
  live: 'bg-brand-bright/10 text-brand-bright',
};

export const GlassBadge: React.FC<GlassBadgeProps> = ({
  children,
  color = 'neutral',
  className = '',
  dot = false,
}) => (
  <span
    className={`
      glass-pill inline-flex items-center gap-1.5 rounded-full px-3 py-1 type-caption
      ${colorStyles[color]}
      ${className}
    `}
  >
    {dot && <span className="size-1.5 rounded-full bg-current" />}
    {children}
  </span>
);
