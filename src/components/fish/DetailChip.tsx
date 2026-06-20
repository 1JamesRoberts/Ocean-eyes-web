import React from 'react';

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
  <div
    className={`
      flex items-center gap-1.5 rounded-xl p-[8px_12px] text-xs font-semibold
      text-text-main
      ${colorClass || `bg-[rgba(148,163,184,0.12)]`}
    `}
  >
    {icon}
    <span className="
      mr-0.5 text-[10px] font-medium tracking-wider text-text-muted uppercase
    ">
      {label}
    </span>
    {value}
  </div>
);
