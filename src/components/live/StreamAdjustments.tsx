import React, { useState } from 'react';
import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { GlassCard } from '../shared';
import type { CameraFilters } from '../../types/aquarium';

interface StreamAdjustmentsProps {
  filters: CameraFilters;
  onFilterChange: (filters: Partial<CameraFilters>) => void;
}

export const StreamAdjustments: React.FC<StreamAdjustmentsProps> = ({
  filters,
  onFilterChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <GlassCard
      className={`
        flex flex-col
        ${isExpanded ? 'gap-5 p-6' : 'gap-0 px-6 py-4'}
      `}
    >
      <div
        className="flex cursor-pointer items-center justify-between select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="
          m-0 flex items-center gap-2 text-h3 font-bold text-text
        ">
          <span className="flex items-center gap-1.5"><SlidersHorizontal size={16} /> Stream Image Adjustments</span>
        </h3>
        <div className="flex items-center text-text-muted">
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {isExpanded && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            {([
              { key: 'contrast' as const, label: 'Contrast', min: 50, max: 150 },
              { key: 'brightness' as const, label: 'Brightness', min: 70, max: 130 },
              { key: 'saturation' as const, label: 'Saturation', min: 50, max: 150 },
              { key: 'temperature' as const, label: 'Temperature (Cool / Warm)', min: -80, max: 80 },
              { key: 'tint' as const, label: 'Tint (Green / Magenta)', min: -80, max: 80 }
            ] as const).map(({ key, label, min, max }) => (
              <div key={key}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-semibold text-text">{label}</span>
                  <span className="text-brand">
                    {key === 'temperature'
                      ? filters.temperature > 0 ? `Warm (+${filters.temperature})` : filters.temperature < 0 ? `Cool (${filters.temperature})` : 'Neutral'
                      : key === 'tint'
                        ? filters.tint > 0 ? `Magenta (+${filters.tint})` : filters.tint < 0 ? `Green (${filters.tint})` : 'Neutral'
                        : `${filters[key]}%`}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <input
                    type="range" min={min} max={max} step="5"
                    value={filters[key]}
                    onChange={(e) => onFilterChange({ [key]: parseInt(e.target.value) })}
                    className="flex-1 accent-brand-bright"
                  />
                  <button
                    onClick={() => onFilterChange({ [key]: key === 'temperature' || key === 'tint' ? 0 : 100 })}
                    className="
                      cursor-pointer border-none bg-transparent text-2xs
                      text-text-muted
                    "
                  >
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  );
};
