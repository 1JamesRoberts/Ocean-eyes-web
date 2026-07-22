import React from 'react';

interface SliderControlProps {
  label: React.ReactNode;
  ariaLabel?: string;
  value: number;
  displayValue: React.ReactNode;
  min: number | string;
  max: number | string;
  step: number | string;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
}

export const SliderControl: React.FC<SliderControlProps> = ({
  label,
  ariaLabel,
  value,
  displayValue,
  min,
  max,
  step,
  onChange,
  onCommit,
}) => {
  const commitCurrentValue = (target: EventTarget & HTMLInputElement) => {
    onCommit?.(Number(target.value));
  };

  return (
    <label className="block">
      <span className="mb-1 flex justify-between gap-3 type-caption">
        <span className="min-w-0">{label}</span>
        <span className="shrink-0 text-accent-ink">{displayValue}</span>
      </span>
      <input
        type="range"
        aria-label={ariaLabel ?? (typeof label === 'string' ? label : undefined)}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        onMouseUp={(event) => commitCurrentValue(event.currentTarget)}
        onTouchEnd={(event) => commitCurrentValue(event.currentTarget)}
        className="
          w-full accent-verdigris
          focus-visible:outline-2 focus-visible:outline-offset-2
          focus-visible:outline-focus
        "
      />
    </label>
  );
};
