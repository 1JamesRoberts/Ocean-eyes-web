// GlassBadge.tsx — Translucent glass badge/chip primitive
import React from 'react';

type BadgeColor = 'good' | 'warning' | 'critical' | 'info' | 'neutral' | 'live' | 'parameter';

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
  info: 'bg-sky-surge/10 text-sky-surge',
  neutral: 'bg-pine-teal/10 text-pine-teal',
  live: 'bg-verdigris/10 text-verdigris',
  parameter: 'bg-(--color-health-parameter-bg) text-prussian-blue',
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
