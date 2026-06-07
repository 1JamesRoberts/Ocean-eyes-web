import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, SlidersHorizontal } from 'lucide-react';
import type { CameraFilters, FilterPreset } from '../../types/aquarium';

interface StreamAdjustmentsProps {
  filters: CameraFilters;
  onFilterChange: (key: keyof CameraFilters, val: number) => void;
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
    const saved = localStorage.getItem('oceaneyes_camera_presets');
    return saved ? JSON.parse(saved) : [];
  });
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  const applyPreset = (preset: FilterPreset) => {
    setSelectedPresetId(preset.id);
    onFilterChange('contrast', preset.filters.contrast);
    onFilterChange('brightness', preset.filters.brightness);
    onFilterChange('saturation', preset.filters.saturation);
    onFilterChange('temperature', preset.filters.temperature);
    onFilterChange('tint', preset.filters.tint);
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
    <div className="card-decoration" style={{
      padding: isExpanded ? '24px' : '16px 24px',
      marginBottom: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: isExpanded ? '20px' : '0px'
    }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none'
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><SlidersHorizontal size={16} /> Stream Image Adjustments</span>
          {!isExpanded && selectedPresetId !== 'normal' && (
            <span style={{
              fontSize: '11px',
              fontWeight: 500,
              background: 'var(--color-primary-light)',
              color: 'var(--color-primary-dark)',
              padding: '2px 8px',
              borderRadius: '12px',
              marginLeft: '8px'
            }}>
              Active: {activePresetName}
            </span>
          )}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', color: 'var(--color-text-secondary)' }}>
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {isExpanded && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', margin: 0, borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{label}</span>
                  <span style={{ color: 'var(--color-primary)' }}>
                    {key === 'temperature'
                      ? filters.temperature > 0 ? `Warm (+${filters.temperature})` : filters.temperature < 0 ? `Cool (${filters.temperature})` : 'Neutral'
                      : key === 'tint'
                        ? filters.tint > 0 ? `Magenta (+${filters.tint})` : filters.tint < 0 ? `Green (${filters.tint})` : 'Neutral'
                        : `${filters[key]}%`}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="range" min={min} max={max} step="5"
                    value={filters[key]}
                    onChange={(e) => onFilterChange(key, parseInt(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--color-primary)' }}
                  />
                  <button
                    onClick={() => onFilterChange(key, key === 'temperature' || key === 'tint' ? 0 : 100)}
                    style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '10px' }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', margin: 0, borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
              FILTER PRESETS
            </h4>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {DEFAULT_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className="secondary-button"
                  style={{
                    padding: '8px 12px',
                    fontSize: '12px',
                    borderRadius: '8px',
                    background: selectedPresetId === preset.id ? 'var(--color-primary-light)' : 'var(--color-surface)',
                    color: selectedPresetId === preset.id ? 'var(--color-primary-dark)' : 'var(--color-text-primary)',
                    borderColor: selectedPresetId === preset.id ? 'var(--color-primary)' : 'var(--color-border)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {preset.name}
                </button>
              ))}

              {customPresets.map(preset => (
                <div
                  key={preset.id}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}
                >
                  <button
                    onClick={() => applyPreset(preset)}
                    className="secondary-button"
                    style={{
                      padding: '8px 24px 8px 12px',
                      fontSize: '12px',
                      borderRadius: '8px',
                      background: selectedPresetId === preset.id ? 'var(--color-primary-light)' : 'var(--color-surface)',
                      color: selectedPresetId === preset.id ? 'var(--color-primary-dark)' : 'var(--color-text-primary)',
                      borderColor: selectedPresetId === preset.id ? 'var(--color-primary)' : 'var(--color-border)',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {preset.name}
                  </button>
                  <button
                    onClick={(e) => handleDeletePreset(preset.id, e)}
                    style={{
                      position: 'absolute',
                      right: '6px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-critical)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '14px',
                      height: '14px',
                      padding: 0
                    }}
                    title="Delete Preset"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {showSaveInput ? (
              <form onSubmit={handleSavePreset} style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <input
                  type="text"
                  placeholder="Preset Name..."
                  value={newPresetName}
                  onChange={e => setNewPresetName(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-primary)',
                    fontFamily: 'var(--font-main)',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                  maxLength={20}
                  required
                />
                <button
                  type="submit"
                  className="primary-button"
                  style={{ padding: '8px 12px', fontSize: '12px', borderRadius: '8px' }}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  style={{ padding: '8px 12px', fontSize: '12px', borderRadius: '8px' }}
                  onClick={() => { setShowSaveInput(false); setNewPresetName(''); }}
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button
                className="secondary-button"
                style={{
                  alignSelf: 'flex-start',
                  padding: '8px 12px',
                  fontSize: '12px',
                  borderRadius: '8px',
                  borderColor: 'var(--color-primary)',
                  color: 'var(--color-primary-dark)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '8px',
                  cursor: 'pointer'
                }}
                onClick={() => setShowSaveInput(true)}
              >
                <Plus size={12} style={{ color: 'var(--color-primary)' }} />
                <span style={{ color: 'var(--color-primary-dark)' }}>Save Current as Preset</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
