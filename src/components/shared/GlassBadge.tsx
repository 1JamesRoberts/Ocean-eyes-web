// GlassBadge.tsx — Translucent glass badge/chip primitive
import React from 'react';

type BadgeColor = 'good' | 'parameter';

interface GlassBadgeProps {
  children: React.ReactNode;
  color: BadgeColor;
  className?: string;
}

const colorStyles: Record<BadgeColor, string> = {
  good: 'bg-good/10 text-good',
  parameter: 'bg-(--color-health-parameter-bg) text-prussian-blue',
};

export const GlassBadge: React.FC<GlassBadgeProps> = ({
  children,
  color,
  className = '',
}) => (
  <span
    className={`
      glass-pill inline-flex items-center gap-1.5 rounded-full px-3 py-1 type-caption
      ${colorStyles[color]}
      ${className}
    `}
  >
    {children}
  </span>
);
