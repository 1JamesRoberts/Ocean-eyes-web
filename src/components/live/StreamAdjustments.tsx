import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, SlidersHorizontal } from 'lucide-react';
import { GlassCard, GlassButton, GlassBadge, GlassInput } from '../shared';
import type { CameraFilters, FilterPreset } from '../../types/aquarium';

interface StreamAdjustmentsProps {
  filters: CameraFilters;
  onFilterChange: (filters: Partial<CameraFilters>) => void;
  filterPresets: FilterPreset[];
  onSavePreset: (preset: FilterPreset) => void;
  onDeletePreset: (id: string) => void;
}

const DEFAULT_PRESETS: FilterPreset[] = [
  {
    id: 'normal',
    name: 'Normal',
    isCustom: false,
    filters: { contrast: 100, brightness: 100, saturation: 100, temperature: 0, tint: 0 }
  },
  {
    id: 'vivid',
    name: 'Vivid Reef',
    isCustom: false,
    filters: { contrast: 125, brightness: 100, saturation: 140, temperature: 10, tint: 0 }
  },
  {
    id: 'deep-blue',
    name: 'Deep Blue',
    isCustom: false,
    filters: { contrast: 110, brightness: 95, saturation: 120, temperature: -40, tint: 10 }
  },
  {
    id: 'cctv-retro',
    name: 'CCTV Retro',
    isCustom: false,
    filters: { contrast: 85, brightness: 105, saturation: 0, temperature: 0, tint: 0 }
  }
];

export const StreamAdjustments: React.FC<StreamAdjustmentsProps> = ({
  filters,
  onFilterChange,
  filterPresets,
  onSavePreset,
  onDeletePreset,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('normal');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  const applyPreset = (preset: FilterPreset) => {
    setSelectedPresetId(preset.id);
    onFilterChange(preset.filters);
  };

  const handleSavePreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    const presetId = `preset-${Date.now()}`;
    const newPreset: FilterPreset = {
      id: presetId,
      name: newPresetName.trim(),
      isCustom: true,
      filters: { ...filters }
    };

    onSavePreset(newPreset);
    setSelectedPresetId(presetId);
    setNewPresetName('');
    setShowSaveInput(false);
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeletePreset(id);
    if (selectedPresetId === id) {
      applyPreset(DEFAULT_PRESETS[0]);
    }
  };

  const activePresetName = [...DEFAULT_PRESETS, ...filterPresets].find(p => p.id === selectedPresetId)?.name || 'Custom';

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
          {!isExpanded && selectedPresetId !== 'normal' && (
            <GlassBadge color="info" className="ml-2">
              Active: {activePresetName}
            </GlassBadge>
          )}
        </h3>
        <div className="flex items-center text-text-muted">
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {isExpanded && (
        <div className="
          grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6
        ">
          <div className="flex flex-col gap-4">
            <h4 className="
              m-0 border-b border-border pb-1.5 text-sm font-semibold
              text-text-muted
            ">
              TUNING SLIDERS
            </h4>

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
                    Reset
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <h4 className="
              m-0 border-b border-border pb-1.5 text-sm font-semibold
              text-text-muted
            ">
              FILTER PRESETS
            </h4>

            <div className="flex flex-wrap gap-2">
              {DEFAULT_PRESETS.map(preset => (
                <GlassButton
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  variant={selectedPresetId === preset.id ? 'primary' : 'default'}
                  size="sm"
                >
                  {preset.name}
                </GlassButton>
              ))}

              {filterPresets.map(preset => (
                <div key={preset.id} className="
                  relative flex items-center gap-1
                ">
                  <GlassButton
                    onClick={() => applyPreset(preset)}
                    variant={selectedPresetId === preset.id ? 'primary' : 'default'}
                    size="sm"
                    className="pr-6"
                  >
                    {preset.name}
                  </GlassButton>
                  <button
                    onClick={(e) => handleDeletePreset(preset.id, e)}
                    className="
                      absolute top-1/2 right-1.5 flex size-3.5 -translate-y-1/2
                      cursor-pointer items-center justify-center border-none
                      bg-transparent p-0 text-xs text-critical
                    "
                    title="Delete Preset"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {showSaveInput ? (
              <form onSubmit={handleSavePreset} className="mt-2.5 flex gap-2">
                <GlassInput
                  placeholder="Preset Name..."
                  value={newPresetName}
                  onChange={e => setNewPresetName(e.target.value)}
                  maxLength={20}
                  required
                  className="flex-1 text-xs"
                />
                <GlassButton type="submit" variant="primary" size="sm">
                  Save
                </GlassButton>
                <GlassButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setShowSaveInput(false); setNewPresetName(''); }}
                >
                  Cancel
                </GlassButton>
              </form>
            ) : (
              <GlassButton
                variant="outline"
                size="sm"
                className="mt-2 self-start"
                onClick={() => setShowSaveInput(true)}
              >
                <Plus size={12} />
                Save Current as Preset
              </GlassButton>
            )}
          </div>
        </div>
      )}
    </GlassCard>
  );
};
