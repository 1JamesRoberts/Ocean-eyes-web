import React, { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { GlassDisclosurePanel, SliderControl } from '../shared';
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
  const summary = `Contrast ${filters.contrast}%, brightness ${filters.brightness}%, saturation ${filters.saturation}%`;

  return (
    <GlassDisclosurePanel
      icon={SlidersHorizontal}
      title="Stream Image Adjustments"
      detail={summary}
      expanded={isExpanded}
      onToggle={() => setIsExpanded((current) => !current)}
    >
      {([
        { key: 'contrast' as const, label: 'Contrast', min: 50, max: 150 },
        { key: 'brightness' as const, label: 'Brightness', min: 70, max: 130 },
        { key: 'saturation' as const, label: 'Saturation', min: 50, max: 150 },
        { key: 'temperature' as const, label: 'Temperature (Cool / Warm)', min: -80, max: 80 },
        { key: 'tint' as const, label: 'Tint (Green / Magenta)', min: -80, max: 80 },
      ] as const).map(({ key, label, min, max }) => (
        <SliderControl
          key={key}
          label={label}
          min={min}
          max={max}
          step={5}
          value={filters[key]}
          displayValue={
            key === 'temperature'
              ? filters.temperature > 0 ? `Warm (+${filters.temperature})` : filters.temperature < 0 ? `Cool (${filters.temperature})` : 'Neutral'
              : key === 'tint'
                ? filters.tint > 0 ? `Magenta (+${filters.tint})` : filters.tint < 0 ? `Green (${filters.tint})` : 'Neutral'
                : `${filters[key]}%`
          }
          onChange={(value) => onFilterChange({ [key]: value })}
        />
      ))}
    </GlassDisclosurePanel>
  );
};
