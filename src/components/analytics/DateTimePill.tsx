// DateTimePill.tsx - Rounded pill button used in the date/time range picker
import React from 'react';

interface DateTimePillProps {
  label: string;
  isActive?: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export const DateTimePill: React.FC<DateTimePillProps> = ({
  label,
  isActive = false,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`
      cursor-pointer rounded-full border-none px-4 py-2.5 text-[15px]
      font-medium whitespace-nowrap transition-colors
      ${isActive
        ? 'bg-primary-gradient text-text-inv shadow-button'
        : `
          bg-surface-hover text-text-main
          hover:bg-border-card
        `
      }
    `}
  >
    {label}
  </button>
);
