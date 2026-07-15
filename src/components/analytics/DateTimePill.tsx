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
      overlay-glass-control inline-flex w-full min-w-0 items-center justify-center whitespace-nowrap rounded-full
      px-2 py-2.5 type-body
      focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine-teal
      ${isActive
        ? 'fish-count-teal-outline text-white'
        : 'text-white hover:text-white'}
    `}
  >
    {label}
  </button>
);
