import React from 'react';
import { Droplets, FlaskConical, Thermometer } from 'lucide-react';
import { calculateHealthScore, getHealthHeading, getHealthMessage, type HealthReading } from '../../models/services/healthService';

interface HealthScoreCardProps {
  reading: HealthReading;
}

export const HealthScoreCard = React.memo<HealthScoreCardProps>(({ reading }) => {
  const healthScore = calculateHealthScore(reading);
  const healthMessage = getHealthMessage(healthScore);
  const healthHeading = getHealthHeading(healthScore);
  const strokeWidth = 8;
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - healthScore / 10);
  const parameters = [
    {
      label: 'Clarity',
      value: `${reading.clarity.toFixed(2)} FNU`,
      icon: Droplets,
    },
    {
      label: 'pH',
      value: reading.ph === undefined ? '—' : `${reading.ph} pH`,
      icon: FlaskConical,
    },
    {
      label: 'Temperature',
      value: reading.temp === undefined ? '—' : `${reading.temp}°C`,
      icon: Thermometer,
    },
  ];

  return (
    <section className="shimmer flex items-center gap-5 glass-card p-5">
      <div className="
        relative flex size-28 shrink-0 items-center justify-center
      ">
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
        <div className="
          absolute inset-0 flex flex-col items-center justify-center
        ">
          <span className="text-2xl font-bold text-brand">{healthScore}</span>
          <span className="type-caption">Score</span>
        </div>
      </div>

      <div className="flex-1">
        <span className="block type-caption">{healthHeading}</span>
        <h3 className="whitespace-nowrap text-[17px] font-bold leading-tight text-brand sm:text-2xl">
          Aquarium Health
        </h3>
        <p className="mt-0.5 type-caption">{healthMessage}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {parameters.map((parameter) => (
            <div
              key={parameter.label}
              className="
                flex min-w-0 items-center gap-1.5 rounded-full border
                border-white/20 bg-white/25 px-2.5 py-1.5
              "
            >
              <parameter.icon aria-hidden="true" className="size-3.5 shrink-0 text-brand-bright" />
              <span className="sr-only">{parameter.label}: </span>
              <span className="whitespace-nowrap text-[11px] font-semibold text-brand sm:text-xs">
                {parameter.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

HealthScoreCard.displayName = 'HealthScoreCard';
