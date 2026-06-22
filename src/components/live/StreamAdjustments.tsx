import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, SlidersHorizontal } from 'lucide-react';
import { Button } from '../shared/Button';
import { DashboardCard } from '../shared/DashboardCard';
import type { CameraFilters, FilterPreset } from '../../types/aquarium';

interface StreamAdjustmentsProps {
  filters: CameraFilters;
  onFilterChange: (filters: Partial<CameraFilters>) => void;
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
  onFilterChange
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('normal');
  const [customPresets, setCustomPresets] = useState<FilterPreset[]>(() => {
    try {
      const saved = localStorage.getItem('oceaneyes_camera_presets');
      return saved ? (JSON.parse(saved) as FilterPreset[]) : [];
    } catch {
      return [];
    }
  });
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

    const updated = [...customPresets, newPreset];
    setCustomPresets(updated);
    localStorage.setItem('oceaneyes_camera_presets', JSON.stringify(updated));
    setSelectedPresetId(presetId);
    setNewPresetName('');
    setShowSaveInput(false);
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customPresets.filter(p => p.id !== id);
    setCustomPresets(updated);
    localStorage.setItem('oceaneyes_camera_presets', JSON.stringify(updated));
    if (selectedPresetId === id) {
      applyPreset(DEFAULT_PRESETS[0]);
    }
  };

  const activePresetName = [...DEFAULT_PRESETS, ...customPresets].find(p => p.id === selectedPresetId)?.name || 'Custom';

  return (
    <DashboardCard
      className={`
        flex flex-col
        ${isExpanded ? 'gap-5' : 'gap-0 px-6 py-4'}
      `}
    >
      <div
        className="flex cursor-pointer items-center justify-between select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="
          m-0 flex items-center gap-2 text-[15px] font-bold text-text-main
        ">
          <span className="flex items-center gap-1.5"><SlidersHorizontal size={16} /> Stream Image Adjustments</span>
          {!isExpanded && selectedPresetId !== 'normal' && (
            <span className="
              ml-2 rounded-xl bg-primary-light-gradient px-2 py-0.5 text-[11px]
              font-medium text-primary-dark
            ">
              Active: {activePresetName}
            </span>
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
              m-0 border-b border-border-card pb-1.5 text-[13px] font-semibold
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
                  <span className="font-semibold text-text-main">{label}</span>
                  <span className="text-primary-dark">
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
                    className="flex-1 accent-primary-dark"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[10px]"
                    onClick={() => onFilterChange({ [key]: key === 'temperature' || key === 'tint' ? 0 : 100 })}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <h4 className="
              m-0 border-b border-border-card pb-1.5 text-[13px] font-semibold
              text-text-muted
            ">
              FILTER PRESETS
            </h4>

            <div className="flex flex-wrap gap-2">
              {DEFAULT_PRESETS.map(preset => (
                <Button
                  key={preset.id}
                  variant={selectedPresetId === preset.id ? 'primary' : 'secondary'}
                  size="sm"
                  className="rounded-lg px-3 py-2 text-xs"
                  onClick={() => applyPreset(preset)}
                >
                  {preset.name}
                </Button>
              ))}

              {customPresets.map(preset => (
                <div
                  key={preset.id}
                  className="relative flex items-center gap-1"
                >
                  <Button
                    variant={selectedPresetId === preset.id ? 'primary' : 'secondary'}
                    size="sm"
                    className="rounded-lg py-2 pr-6 pl-3 text-xs"
                    onClick={() => applyPreset(preset)}
                  >
                    {preset.name}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="
                      absolute top-1/2 right-1.5 size-3.5 -translate-y-1/2 p-0
                      text-xs text-critical
                    "
                    onClick={(e) => handleDeletePreset(preset.id, e)}
                    title="Delete Preset"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>

            {showSaveInput ? (
              <form onSubmit={handleSavePreset} className="mt-2.5 flex gap-2">
                <input
                  type="text"
                  placeholder="Preset Name..."
                  value={newPresetName}
                  onChange={e => setNewPresetName(e.target.value)}
                  className="
                    flex-1 rounded-lg border border-border-card bg-surface-card
                    px-3 py-2 font-main text-xs text-text-main outline-none
                  "
                  maxLength={20}
                  required
                />
                <Button type="submit" size="sm" className="
                  rounded-lg px-3 py-2 text-xs
                ">
                  Save
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="rounded-lg px-3 py-2 text-xs"
                  onClick={() => { setShowSaveInput(false); setNewPresetName(''); }}
                >
                  Cancel
                </Button>
              </form>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                className="
                  mt-2 inline-flex items-center gap-1 self-start rounded-lg
                  border-primary-dark px-3 py-2 text-xs text-primary-dark
                "
                onClick={() => setShowSaveInput(true)}
              >
                <Plus size={12} />
                <span>Save Current as Preset</span>
              </Button>
            )}
          </div>
        </div>
      )}
    </DashboardCard>
  );
};
