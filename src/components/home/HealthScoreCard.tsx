import React from 'react';
import { calculateHealthScore, getHealthMessage, type HealthReading } from '../../models/services/healthService';

interface HealthScoreCardProps {
  reading: HealthReading;
}

export const HealthScoreCard = React.memo<HealthScoreCardProps>(({ reading }) => {
  const healthScore = calculateHealthScore(reading);
  const healthMessage = getHealthMessage(healthScore);
  const strokeWidth = 8;
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - healthScore / 10);

  return (
    <section className="shimmer flex items-center gap-5 glass-card p-5">
      <div className="relative flex size-28 shrink-0 items-center justify-center">
        <svg className="size-28" height="112" width="112" viewBox="0 0 112 112">
          <defs>
            <linearGradient id="healthRingGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#004349" />
              <stop offset="100%" stopColor="#196a59" />
            </linearGradient>
          </defs>
          <circle
            cx="56"
            cy="56"
            r={radius}
            className="text-text-muted/20"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle
            cx="56"
            cy="56"
            r={radius}
            className="progress-ring-circle"
            stroke="url(#healthRingGradient)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-brand">{healthScore}</span>
          <span className="text-[10px] font-medium text-text-muted">Score</span>
        </div>
      </div>

      <div className="flex-1">
        <span className="block text-xs text-text-muted">Aquarium Health Index</span>
        <h3 className="text-2xl font-bold text-brand">{healthMessage}</h3>
        <p className="mt-0.5 text-xs text-text-muted">
          All parameters are in safe bands. System is optimal.
        </p>
      </div>
    </section>
  );
});

HealthScoreCard.displayName = 'HealthScoreCard';

