import React from 'react';
import { FlaskConical, Thermometer, Shield, Zap, Cloud } from 'lucide-react';
import type { ReadingItem } from '../../types/aquarium';

interface WaterChemistryGridProps {
  reading: ReadingItem;
}

export const WaterChemistryGrid = React.memo<WaterChemistryGridProps>(({ reading }) => {
  const parameters = [
    {
      label: 'pH Value',
      value: reading.ph === undefined ? '—' : `${reading.ph} pH`,
      colorClass: 'text-brand-bright bg-brand-glow/30',
      icon: FlaskConical,
      isCritical: false
    },
    {
      label: 'Temperature',
      value: reading.temp === undefined ? '—' : `${reading.temp}°C`,
      colorClass: 'text-orange-600 bg-orange-100/30',
      icon: Thermometer,
      isCritical: false
    },
    {
      label: 'Ammonia (NH₃)',
      value: reading.ammonia === undefined ? '—' : `${reading.ammonia} ppm`,
      colorClass: 'text-brand bg-brand/10',
      icon: Shield,
      isCritical: (reading.ammonia ?? 0) > 0
    },
    {
      label: 'Nitrite (NO₂⁻)',
      value: reading.nitrite === undefined ? '—' : `${reading.nitrite} ppm`,
      colorClass: 'text-purple-600 bg-purple-100/30',
      icon: Zap,
      isCritical: (reading.nitrite ?? 0) > 0.2
    },
    {
      label: 'CO₂',
      value: '—',
      colorClass: 'text-blue-600 bg-blue-100/30',
      icon: Cloud,
      isCritical: false
    }
  ];

  return (
    <section className="glass-card p-6">
      <h3 className="
        mb-4 text-xs font-medium tracking-widest text-text-muted/70
        uppercase
      ">
        Water Chemistry Parameters
      </h3>

      <div className="space-y-3">
        {parameters.map(param => (
          <div
            key={param.label}
            className="
              flex items-center gap-4 rounded-2xl border border-white/20
              bg-white/20 p-3 transition-colors
              hover:bg-white/60
            "
          >
            <div
              className={`
                flex size-10 shrink-0 items-center justify-center rounded-full
                ${param.colorClass}
              `}
            >
              <param.icon size={18} />
            </div>
            <div className="flex-1">
              <span className="block text-xs text-text-muted">{param.label}</span>
              <span className={`
                text-base font-bold
                ${param.isCritical ? `text-critical` : `text-brand`}
              `}>
                {param.value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
});

WaterChemistryGrid.displayName = 'WaterChemistryGrid';
