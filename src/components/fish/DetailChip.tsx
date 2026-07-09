import React from 'react';
import { GlassBadge } from '../shared';

interface DetailChipProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  colorClass?: string;
}

export const DetailChip: React.FC<DetailChipProps> = ({
  icon,
  label,
  value,
  colorClass,
}) => (
  <GlassBadge
    className={`
      gap-1.5 rounded-xl px-3 py-1.5 type-caption
      ${colorClass || ''}
    `}
  >
    {icon}
    <span className="mr-0.5 type-caption">
      {label}
    </span>
    {value}
  </GlassBadge>
);
