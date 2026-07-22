import React from 'react';
import { Cloud, Droplets, FlaskConical, Shield, Thermometer, type LucideIcon } from 'lucide-react';
import type { ReadingItem } from '../../types/aquarium';

interface WaterChemistryGridProps {
  reading: ReadingItem;
  displayClarity: number;
  onViewHistory: () => void;
}

interface ParameterTileProps {
  icon: LucideIcon;
  label: string;
  value: string;
  unit: string;
  isCritical: boolean;
  isUnavailable?: boolean;
  onClick?: () => void;
}

const tileClassName = `
  flex flex-col items-center gap-1.5 rounded-2xl border
  border-white/20 bg-white/20 p-2 pb-1 text-center transition-colors
  hover:bg-white/60
`;

const ParameterTile: React.FC<ParameterTileProps> = ({
  icon: Icon,
  label,
  value,
  unit,
  isCritical,
  isUnavailable = false,
  onClick,
}) => {
  const statusClassName = isUnavailable
    ? 'bg-slate-grey/35'
    : isCritical
      ? 'bg-critical'
      : 'bg-good';

  const content = (
    <>
      <Icon aria-hidden="true" className="size-4 shrink-0 text-data-primary" />
      <span className="type-caption text-[10px] font-semibold text-slate-grey">{label}</span>
      <div className={`flex items-baseline justify-center ${isCritical ? 'text-critical' : 'text-prussian-blue'}`}>
        <span className="text-[14px] leading-none font-bold">
          {value}
        </span>
        <span className="ml-0.5 text-[10px] leading-none font-semibold">{unit}</span>
      </div>
      <span aria-hidden="true" className={`mt-0.5 size-2 rounded-full ${statusClassName}`} />
    </>
  );

  if (onClick) {
    return (
      <button type="button" aria-label={`View ${label} history`} className={`${tileClassName} cursor-pointer`} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className={tileClassName}>{content}</div>;
};

export const WaterChemistryGrid = React.memo<WaterChemistryGridProps>(({ reading, displayClarity, onViewHistory }) => {
  const parameters = [
    {
      label: 'Clarity',
      value: displayClarity.toFixed(2),
      unit: 'FNU',
      icon: Droplets,
      isCritical: false,
      onClick: onViewHistory,
    },
    {
      label: 'pH',
      value: reading.ph === undefined ? '—' : `${reading.ph}`,
      unit: 'pH',
      icon: FlaskConical,
      isCritical: false,
    },
    {
      label: 'Temp',
      value: reading.temp === undefined ? '—' : `${reading.temp}`,
      unit: '°C',
      icon: Thermometer,
      isCritical: false,
    },
    {
      label: 'NO₂',
      value: reading.nitrite === undefined ? '—' : `${reading.nitrite}`,
      unit: 'ppm',
      icon: Shield,
      isCritical: (reading.nitrite ?? 0) > 0.2,
    },
    {
      label: 'CO₂',
      value: '—',
      unit: 'ppm',
      icon: Cloud,
      isCritical: false,
      isUnavailable: true,
    }
  ];

  return (
    <div className="grid grid-cols-5 gap-2">
      {parameters.map(param => (
        <ParameterTile
          key={param.label}
          {...param}
        />
      ))}
    </div>
  );
});

WaterChemistryGrid.displayName = 'WaterChemistryGrid';
