import React from 'react';
import { calculateHealthScore, getHealthColor, getHealthMessage, type HealthReading } from '../../models/services/healthService';

interface HealthScoreCardProps {
  reading: HealthReading;
}

export const HealthScoreCard = React.memo<HealthScoreCardProps>(({ reading }) => {
  const healthScore = calculateHealthScore(reading);
  const healthColor = getHealthColor(healthScore);
  const healthMessage = getHealthMessage(healthScore);
  const circumference = 2 * Math.PI * 38;
  const dashOffset = circumference * (1 - healthScore / 10);

  return (
    <div className="
      flex items-center gap-6 rounded-[20px] border
      border-[rgba(13,148,136,0.02)] bg-surface-card p-6 shadow-card
      transition-smooth
      hover:-translate-y-px hover:border-[rgba(13,148,136,0.12)]
      hover:shadow-[0_8px_24px_rgba(13,148,136,0.08)]
    ">
      <div className="
        relative flex size-[90px] shrink-0 items-center justify-center
      ">
        <svg className="absolute size-[90px] -rotate-90">
          <circle cx="45" cy="45" r="38" stroke="var(--color-background)" strokeWidth="8" fill="none" />
          <circle
            cx="45"
            cy="45"
            r="38"
            stroke={healthColor}
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="transition-smooth"
          />
        </svg>
        <div className="z-50 text-center">
          <span className="text-[28px] font-extrabold text-text-main">{healthScore}</span>
          <span className="
            -mt-1 block text-[11px] font-semibold text-text-muted
          ">Score</span>
        </div>
      </div>

      <div className="flex-1">
        <h3 className="text-lg font-bold text-text-main">Aquarium Health Index</h3>
        <p className="mt-1.5 text-sm leading-[145%] text-text-muted">
          {healthMessage}
        </p>
      </div>
    </div>
  );
});

HealthScoreCard.displayName = 'HealthScoreCard';

