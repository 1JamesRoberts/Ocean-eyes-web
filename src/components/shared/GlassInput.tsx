// GlassInput.tsx — Translucent glass input primitive
import React from 'react';

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  className?: string;
}

export const GlassInput: React.FC<GlassInputProps> = ({
  label,
  className = '',
  id,
  ...rest
}) => (
  <div className="flex flex-col gap-1.5">
    {label && (
      <label htmlFor={id} className="
        text-xs font-semibold text-text-muted
      ">
        {label}
      </label>
    )}
    <input
      id={id}
      className={`
        glass-input
        ${className}
      `}
      {...rest}
    />
  </div>
);
