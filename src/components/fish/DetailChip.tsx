import React from 'react';
import { GlassBadge } from '../shared';

interface DetailChipProps {
  icon?: React.ReactNode;
  label: string;
  value: string;
}

export const DetailChip: React.FC<DetailChipProps> = ({
  icon,
  label,
  value,
}) => (
  <GlassBadge
    color="parameter"
    className="
      w-full min-w-0 justify-between gap-2 rounded-xl px-3 py-1.5 type-caption
    "
  >
    {icon && <span className="shrink-0">{icon}</span>}
    <span className="min-w-0 flex-1 break-words leading-tight type-caption">
      {label}
    </span>
    <span className="min-w-0 flex-1 break-words text-right type-caption">
      {value}
    </span>
  </GlassBadge>
);
