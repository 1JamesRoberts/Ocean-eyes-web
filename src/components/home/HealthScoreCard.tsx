import React from 'react';
import { ChevronRight, Droplets, FlaskConical, Thermometer } from 'lucide-react';
import {
  calculateHealthScore,
  getHealthColor,
  getHealthHeading,
  getHealthMessage,
  type HealthReading,
} from '../../models/services/healthService';

interface HealthScoreCardProps {
  reading: HealthReading;
}

export const HealthScoreCard = React.memo<HealthScoreCardProps>(({ reading }) => {
  const healthScore = calculateHealthScore(reading);
  const healthMessage = getHealthMessage(healthScore);
  const healthHeading = getHealthHeading(healthScore);
  const healthColor = getHealthColor(healthScore);
  const displayScore = Math.round(healthScore * 10);
  const strokeWidth = 9;
  const radius = 50;
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
    <section className="
      shimmer mx-auto grid w-full max-w-sm grid-cols-[7.25rem_minmax(0,1fr)]
      items-center gap-4 glass-card rounded-(--glass-radius-card) px-3.5 py-2.5 -mt-2
    ">
      <div className="
        relative flex size-29 shrink-0 items-center justify-center
      ">
        <svg
          className="size-full -rotate-90"
          viewBox="0 0 112 112"
        >
          <defs>
            <linearGradient id="healthRingGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--color-turquoise-surf)" />
              <stop offset="100%" stopColor="var(--color-verdigris)" />
            </linearGradient>
          </defs>
          <circle
            cx="56"
            cy="56"
            r={radius}
            stroke="var(--color-health-parameter-bg)"
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
          <span className="
            text-[2.5rem] leading-none font-semibold tracking-[-0.06em] text-prussian-blue
          ">{displayScore}</span>
          <span className="mt-1 text-[13px] leading-none text-slate-grey">/100</span>
        </div>
      </div>

      <div className="relative min-w-0 self-stretch py-1">
        <ChevronRight
          aria-hidden="true"
          size={18}
          className="absolute top-0 right-0 text-slate-grey"
        />
        <div className="flex items-center gap-2 pr-7">
          <span
            aria-hidden="true"
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: healthColor }}
          />
          <span className="text-[13px] font-medium" style={{ color: healthColor }}>{healthHeading}</span>
        </div>
        <h3 className="mt-2 type-title whitespace-nowrap">
          Aquarium Health
        </h3>
        <p className="mt-2 text-[13px]/tight text-slate-grey">{healthMessage}</p>
        <div className="mt-4 grid grid-cols-3 gap-1.5">
          {parameters.map((parameter) => (
            <div
              key={parameter.label}
              className="
                flex min-w-0 items-center justify-center gap-1 rounded-[0.625rem]
                bg-(--color-health-parameter-bg) px-1.5 py-1.5
              "
            >
              <parameter.icon aria-hidden="true" className="
                size-4 shrink-0 text-turquoise-surf
              " />
              <span className="sr-only">{parameter.label}: </span>
              <span className="
                min-w-0 truncate text-2xs font-medium whitespace-nowrap
                text-prussian-blue
                sm:text-xs
              ">
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
