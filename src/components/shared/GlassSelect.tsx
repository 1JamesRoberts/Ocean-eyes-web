// GlassSelect.tsx — Translucent glass select primitive
import React from 'react';

interface GlassSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: React.ReactNode;
  className?: string;
}

export const GlassSelect: React.FC<GlassSelectProps> = ({
  label,
  children,
  className = '',
  id,
  ...rest
}) => (
  <div className="flex flex-col gap-1.5">
    {label && (
      <label htmlFor={id} className="type-caption">
        {label}
      </label>
    )}
    <select
      id={id}
      className={`
        glass-input appearance-none
        ${className}
      `}
      {...rest}
    >
      {children}
    </select>
  </div>
);
