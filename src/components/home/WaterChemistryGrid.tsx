import React from 'react';
import { Droplet, Thermometer, Shield, Activity } from 'lucide-react';
import type { ReadingItem } from '../../types/aquarium';

interface WaterChemistryGridProps {
  reading: ReadingItem;
}

export const WaterChemistryGrid = React.memo<WaterChemistryGridProps>(({ reading }) => {
  const parameters = [
    {
      label: 'pH Value',
      value: reading.ph === undefined ? '—' : `${reading.ph} pH`,
      colorClass: 'text-good bg-good/8',
      icon: Droplet,
      isCritical: false
    },
    {
      label: 'Temperature',
      value: reading.temp === undefined ? '—' : `${reading.temp}°C`,
      colorClass: 'text-warning bg-warning/8',
      icon: Thermometer,
      isCritical: false
    },
    {
      label: 'Ammonia (NH₃)',
      value: reading.ammonia === undefined ? '—' : `${reading.ammonia} ppm`,
      colorClass: 'text-good bg-good/8',
      icon: Shield,
      isCritical: (reading.ammonia ?? 0) > 0
    },
    {
      label: 'Nitrite (NO₂⁻)',
      value: reading.nitrite === undefined ? '—' : `${reading.nitrite} ppm`,
      colorClass: 'text-[#8B5CF6] bg-[rgba(139,92,246,0.08)]',
      icon: Activity,
      isCritical: (reading.nitrite ?? 0) > 0.2
    }
  ];

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
      {parameters.map(param => (
        <div key={param.label} className="
          flex items-center gap-2.5 rounded-2xl border border-border-subtle
          bg-surface-card p-3 shadow-card
        ">
          <div
            className={`
              flex size-9 shrink-0 items-center justify-center rounded-xl
              ${param.colorClass}
            `}
          >
            <param.icon size={16} />
          </div>
          <div>
            <span className="block text-caption font-semibold text-text-muted">{param.label}</span>
            <span className={`
              text-base font-bold
              ${param.isCritical ? `text-critical` : `text-text-main`}
            `}>
              {param.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
});

WaterChemistryGrid.displayName = 'WaterChemistryGrid';
