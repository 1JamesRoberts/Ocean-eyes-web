import React from 'react';
import { FlaskConical, Thermometer, Shield, Zap, Cloud } from 'lucide-react';
import type { ReadingItem } from '../../types/aquarium';

interface WaterChemistryGridProps {
  reading: ReadingItem;
}

export const WaterChemistryGrid = React.memo<WaterChemistryGridProps>(({ reading }) => {
  const parameters = [
    {
      label: 'pH',
      value: reading.ph === undefined ? '—' : `${reading.ph}`,
      unit: 'pH',
      colorClass: 'text-brand-bright bg-brand-glow/30',
      icon: FlaskConical,
      isCritical: false
    },
    {
      label: 'Temp',
      value: reading.temp === undefined ? '—' : `${reading.temp}`,
      unit: '°C',
      colorClass: 'text-orange-600 bg-orange-100/30',
      icon: Thermometer,
      isCritical: false
    },
    {
      label: 'NH₃',
      value: reading.ammonia === undefined ? '—' : `${reading.ammonia}`,
      unit: 'ppm',
      colorClass: 'text-brand bg-brand/10',
      icon: Shield,
      isCritical: (reading.ammonia ?? 0) > 0
    },
    {
      label: 'NO₂',
      value: reading.nitrite === undefined ? '—' : `${reading.nitrite}`,
      unit: 'ppm',
      colorClass: 'text-purple-600 bg-purple-100/30',
      icon: Zap,
      isCritical: (reading.nitrite ?? 0) > 0.2
    },
    {
      label: 'CO₂',
      value: '—',
      unit: '',
      colorClass: 'text-blue-600 bg-blue-100/30',
      icon: Cloud,
      isCritical: false
    }
  ];

  return (
    <div className="grid grid-cols-5 gap-2">
      {parameters.map(param => (
        <div
          key={param.label}
          className="
            flex flex-col items-center gap-1.5 rounded-2xl border
            border-white/20 bg-white/20 p-2 text-center transition-colors
            hover:bg-white/60
          "
        >
          <div
            className={`
              flex size-8 shrink-0 items-center justify-center rounded-full
              ${param.colorClass}
            `}
          >
            <param.icon size={14} />
          </div>
          <div>
            <span className={`
              block text-sm/tight font-bold
              ${param.isCritical ? `text-critical` : `text-brand`}
            `}>
              {param.value}
            </span>
            <span className="block text-3xs text-text-muted">{param.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
});

WaterChemistryGrid.displayName = 'WaterChemistryGrid';
