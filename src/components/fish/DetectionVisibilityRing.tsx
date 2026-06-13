import React from 'react';
import { Eye } from 'lucide-react';

interface DetectionVisibilityRingProps {
  detected: number;
  expected: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  title?: string;
  className?: string;
}

const DetectionVisibilityRing: React.FC<DetectionVisibilityRingProps> = ({
  detected,
  expected,
  size = 44,
  strokeWidth = 5,
  showLabel = true,
  title,
  className = '',
}) => {
  const pct = expected > 0 ? Math.round((detected / expected) * 100) : 0;
  const color = pct >= 80 ? '#16A34A' : pct >= 50 ? '#D97706' : '#DC2626';

  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (circumference * pct) / 100;
  const gap = circumference - dash;

  const defaultTitle = `${detected} of ${expected} fish detected (${pct}%)`;

  return (
    <div
      className={`
        flex items-center gap-2.5
        ${className}
      `}
      title={title ?? defaultTitle}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible"
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${gap}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
            className="transition-[stroke-dasharray] duration-300 ease-in-out"
          />
        </svg>
        <div className="absolute top-1/2 left-1/2 -translate-1/2">
          <Eye size={size * 0.36} color={color} />
        </div>
      </div>
      {showLabel && (
        <span className="min-w-[40px] text-[13px] font-bold" style={{ color }}>
          {pct}%
        </span>
      )}
    </div>
  );
};

export default DetectionVisibilityRing;
