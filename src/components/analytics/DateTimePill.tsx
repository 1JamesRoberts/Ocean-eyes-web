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
      ${isActive ? 'glass-button-primary' : 'glass-button'}
      px-4 py-2.5 type-body
    `}
  >
    {label}
  </button>
);
