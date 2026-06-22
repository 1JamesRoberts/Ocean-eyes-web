import React from 'react';
import { calculateHealthScore, getHealthMessage, type HealthReading } from '../../models/services/healthService';

interface HealthScoreCardProps {
  reading: HealthReading;
}

export const HealthScoreCard = React.memo<HealthScoreCardProps>(({ reading }) => {
  const healthScore = calculateHealthScore(reading);
  const healthMessage = getHealthMessage(healthScore);
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - healthScore / 10);

  return (
    <section className="
      shimmer flex items-center gap-6 rounded-3xl p-6 glass-card
    ">
      <div className="
        relative flex size-32 shrink-0 items-center justify-center
      ">
        <svg className="progress-ring size-32" height="128" width="128">
          <circle
            cx="64"
            cy="64"
            r={radius}
            className="text-surface-variant"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx="64"
            cy="64"
            r={radius}
            className="progress-ring-circle text-secondary"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="
          absolute inset-0 flex flex-col items-center justify-center
        ">
          <span className="text-3xl font-bold text-primary-dark">{healthScore}</span>
          <span className="text-xs font-medium text-on-surface-variant">Score</span>
        </div>
      </div>

      <div className="flex-1">
        <h3 className="text-xl font-semibold text-primary-dark">Aquarium Health Index</h3>
        <p className="mt-1.5 text-sm/relaxed text-on-surface-variant">
          {healthMessage}
        </p>
      </div>
    </section>
  );
});

HealthScoreCard.displayName = 'HealthScoreCard';

