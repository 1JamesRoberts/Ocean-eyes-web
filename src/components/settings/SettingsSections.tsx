import React from 'react';
import {
  Brain,
  Camera,
  ChevronRight,
  FolderOpen,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Video,
} from 'lucide-react';
import { GlassButton, GlassCard, GlassInput, GlassSelect } from '../shared';
import type {
  AIPreferences,
  CameraFilters,
  CameraSourcePreference,
  FilterPreset,
  LivePreferences,
  TankBrief,
} from '../../types/aquarium';

type RangeParser = 'int' | 'float' | 'percent';

interface SettingsRangeControlProps {
  label: string;
  value: number;
  displayValue: React.ReactNode;
  min: number | string;
  max: number | string;
  step: number | string;
  parser?: RangeParser;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
}

const parseRangeValue = (value: string, parser: RangeParser) => {
  const parsed = parser === 'float' ? parseFloat(value) : parseInt(value);
  return parser === 'percent' ? parsed / 100 : parsed;
};

export const SettingsRangeControl: React.FC<SettingsRangeControlProps> = ({
  label,
  value,
  displayValue,
  min,
  max,
  step,
  parser = 'int',
  onChange,
  onCommit,
}) => {
  const commitCurrentValue = (target: EventTarget & HTMLInputElement) => {
    onCommit(parseRangeValue(target.value, parser));
  };

  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-1.5 flex justify-between text-sm">
        <span className="text-text-muted">{label}</span>
        <strong className="text-brand">{displayValue}</strong>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(parseRangeValue(event.target.value, parser))}
        onMouseUp={(event) => commitCurrentValue(event.currentTarget)}
        onTouchEnd={(event) => commitCurrentValue(event.currentTarget)}
        className="w-full accent-brand-bright"
      />
    </div>
  );
};

interface CameraSourceCardProps {
  devices: MediaDeviceInfo[];
  cameraPermissionState: 'prompt' | 'granted' | 'denied' | 'unknown';
  preferences: LivePreferences;
  onCameraSourceChange: (cameraSource: CameraSourcePreference) => void;
}

export const CameraSourceCard: React.FC<CameraSourceCardProps> = ({
  devices,
  cameraPermissionState,
  preferences,
  onCameraSourceChange,
}) => {
  const cameraSourceValue =
    preferences.cameraSource.type === 'mock' ? 'mock' : preferences.cameraSource.deviceId || 'default';

  const handleCameraSourceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (value === 'mock') {
      onCameraSourceChange({ type: 'mock', label: 'Mock Feed' });
      return;
    }

    const device = devices.find((item) => item.deviceId === value);
    onCameraSourceChange({
      type: 'webcam',
      deviceId: value,
      label: device?.label || 'Webcam',
    });
  };

  return (
    <GlassCard className="p-5">
      <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-text">
        <Camera size={16} className="text-brand" /> Camera Source
      </h4>
      <GlassSelect
        id="camera-source"
        label="Input"
        value={cameraSourceValue}
        onChange={handleCameraSourceChange}
      >
        <option value="default">Default Webcam</option>
        {devices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
          </option>
        ))}
        <option value="mock">Mock / Demo Feed</option>
      </GlassSelect>
      {cameraPermissionState === 'denied' && (
        <p className="mt-2 text-xs text-critical">
          Camera permission is denied. Enable it in your browser settings to use a real webcam.
        </p>
      )}
    </GlassCard>
  );
};

interface CameraFiltersCardProps {
  defaultFilters: CameraFilters;
  filterPresets: FilterPreset[];
  onDeleteFilterPreset: (id: string) => void;
  resetToDefaults: () => void;
}

export const CameraFiltersCard: React.FC<CameraFiltersCardProps> = ({
  defaultFilters,
  filterPresets,
  onDeleteFilterPreset,
  resetToDefaults,
}) => {
  const metrics = [
    { label: 'Contrast', value: `${defaultFilters.contrast}%` },
    { label: 'Brightness', value: `${defaultFilters.brightness}%` },
    { label: 'Saturation', value: `${defaultFilters.saturation}%` },
    { label: 'Temperature', value: defaultFilters.temperature },
    { label: 'Tint', value: defaultFilters.tint },
  ];

  return (
    <GlassCard className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-sm font-bold text-text">
          <SlidersHorizontal size={16} className="text-brand" /> Camera Filters
        </h4>
        <GlassButton variant="outline" size="sm" onClick={resetToDefaults}>
          <RotateCcw size={12} />
          Reset All Defaults
        </GlassButton>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-lg bg-surface p-2.5">
            <span className="block text-xs text-text-muted">{metric.label}</span>
            <strong className="text-text">{metric.value}</strong>
          </div>
        ))}
      </div>

      <div>
        <h5 className="mb-2 text-xs font-semibold uppercase text-text-muted">Saved Presets</h5>
        {filterPresets.length === 0 ? (
          <p className="text-sm text-text-muted">No custom presets saved.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {filterPresets.map((preset) => (
              <div
                key={preset.id}
                className="flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-xs text-text"
              >
                <span>{preset.name}</span>
                <button
                  onClick={() => onDeleteFilterPreset(preset.id)}
                  className="cursor-pointer border-none bg-transparent p-0 text-critical"
                  title="Delete preset"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-text-muted">
        Adjust filters in the live preview above, then save the current look as a preset or as the default filter.
      </p>
    </GlassCard>
  );
};

interface AIPreferencesCardProps {
  preferences: LivePreferences;
  onAutoConnectChange: (autoConnect: boolean) => void;
  onAIPreferenceChange: (patch: Partial<AIPreferences>) => void;
  onAIPreferenceCommit: (patch: Partial<AIPreferences>) => void;
}

export const AIPreferencesCard: React.FC<AIPreferencesCardProps> = ({
  preferences,
  onAutoConnectChange,
  onAIPreferenceChange,
  onAIPreferenceCommit,
}) => {
  const percentValue = (value: number) => Math.round(value * 100);

  return (
    <GlassCard className="p-5">
      <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-text">
        <Brain size={16} className="text-brand" /> AI Preferences
      </h4>

      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-text-muted">Auto-start AI when stream connects</span>
        <button
          onClick={() => onAutoConnectChange(!preferences.autoConnect)}
          className={`
            relative inline-flex h-6 w-11 cursor-pointer rounded-full border-none transition-colors
            ${preferences.autoConnect ? 'bg-brand' : 'bg-surface'}
          `}
        >
          <span
            className={`
              absolute top-1 left-1 inline-block h-4 w-4 rounded-full bg-white transition-transform
              ${preferences.autoConnect ? 'translate-x-5' : 'translate-x-0'}
            `}
          />
        </button>
      </div>

      <SettingsRangeControl
        label="AI Polling Interval"
        value={preferences.ai.pollingIntervalMs}
        displayValue={`${preferences.ai.pollingIntervalMs / 1000}s`}
        min="2000"
        max="60000"
        step="1000"
        onChange={(value) => onAIPreferenceChange({ pollingIntervalMs: value })}
        onCommit={(value) => onAIPreferenceCommit({ pollingIntervalMs: value })}
      />
      <SettingsRangeControl
        label="Detection Confidence Threshold"
        value={percentValue(preferences.ai.detectionConfidenceThreshold)}
        displayValue={`${percentValue(preferences.ai.detectionConfidenceThreshold)}%`}
        min="10"
        max="90"
        step="5"
        parser="percent"
        onChange={(value) => onAIPreferenceChange({ detectionConfidenceThreshold: value })}
        onCommit={(value) => onAIPreferenceCommit({ detectionConfidenceThreshold: value })}
      />
      <SettingsRangeControl
        label="Species Confidence Threshold"
        value={percentValue(preferences.ai.speciesConfidenceThreshold)}
        displayValue={`${percentValue(preferences.ai.speciesConfidenceThreshold)}%`}
        min="10"
        max="90"
        step="5"
        parser="percent"
        onChange={(value) => onAIPreferenceChange({ speciesConfidenceThreshold: value })}
        onCommit={(value) => onAIPreferenceCommit({ speciesConfidenceThreshold: value })}
      />
      <SettingsRangeControl
        label="Diagnosis Minimum Confidence"
        value={percentValue(preferences.ai.diagnosisMinConfidence)}
        displayValue={`${percentValue(preferences.ai.diagnosisMinConfidence)}%`}
        min="30"
        max="90"
        step="5"
        parser="percent"
        onChange={(value) => onAIPreferenceChange({ diagnosisMinConfidence: value })}
        onCommit={(value) => onAIPreferenceCommit({ diagnosisMinConfidence: value })}
      />
    </GlassCard>
  );
};

interface MediaStorageCardProps {
  mediaCounts: { snapshots: number; recordings: number };
  clearSnapshots: () => void;
  clearRecordings: () => void;
}

export const MediaStorageCard: React.FC<MediaStorageCardProps> = ({
  mediaCounts,
  clearSnapshots,
  clearRecordings,
}) => {
  const rows = [
    { label: 'Snapshots', count: mediaCounts.snapshots, onClear: clearSnapshots },
    { label: 'Recordings', count: mediaCounts.recordings, onClear: clearRecordings },
  ];

  return (
    <GlassCard className="p-5">
      <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-text">
        <FolderOpen size={16} className="text-brand" /> Media Storage
      </h4>
      <div className="flex flex-col gap-4">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between rounded-lg bg-surface p-3">
            <div className="flex items-center gap-3">
              <Video size={18} className="text-text-muted" />
              <div>
                <span className="block text-sm font-semibold text-text">{row.label}</span>
                <span className="text-xs text-text-muted">{row.count} saved</span>
              </div>
            </div>
            <GlassButton variant="outline" size="sm" onClick={row.onClear} disabled={row.count === 0}>
              <Trash2 size={12} />
              Clear
            </GlassButton>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

interface TankIdentityCardProps {
  activeTank?: TankBrief | null;
  editing: boolean;
  name: string;
  setName: (name: string) => void;
  handleNameChange: (event: React.FormEvent) => void;
  onStartRename: () => void;
}

export const TankIdentityCard: React.FC<TankIdentityCardProps> = ({
  activeTank,
  editing,
  name,
  setName,
  handleNameChange,
  onStartRename,
}) => (
  <GlassCard className="p-5">
    {editing ? (
      <form onSubmit={handleNameChange} className="flex gap-2.5">
        <GlassInput id="tank-name" value={name} onChange={(event) => setName(event.target.value)} />
        <GlassButton variant="primary" size="sm" type="submit">Save</GlassButton>
      </form>
    ) : (
      <div className="flex items-center justify-between">
        <div>
          <span className="text-caption font-semibold text-text-muted uppercase">Tank Name</span>
          <strong className="mt-0.5 block text-lg text-text">{activeTank?.name}</strong>
        </div>
        <GlassButton variant="outline" size="sm" onClick={onStartRename}>Rename</GlassButton>
      </div>
    )}

    <div className="mt-4 border-t border-border pt-4 text-xs text-text-muted">
      <span>Tank Reference Code: </span>
      <code className="ml-1 inline-block px-1.5 py-0.5 align-middle text-caption">
        {activeTank?.id}
      </code>
    </div>
  </GlassCard>
);

interface SettingsMenuCardProps {
  onNavigateToFish: () => void;
  onNavigateToHistory: () => void;
  onNavigateToAlerts: () => void;
  onNavigateToMonitor: () => void;
}

export const SettingsMenuCard: React.FC<SettingsMenuCardProps> = ({
  onNavigateToFish,
  onNavigateToHistory,
  onNavigateToAlerts,
  onNavigateToMonitor,
}) => {
  const rows = [
    { label: 'Manage Fish Inventory', onClick: onNavigateToFish },
    { label: 'Water Clarity Reports', onClick: onNavigateToHistory },
    { label: 'Safety Alert Logs', onClick: onNavigateToAlerts },
    { label: 'IoT Scanner Console', onClick: onNavigateToMonitor, highlight: true },
  ];

  return (
    <GlassCard className="px-4 py-1">
      {rows.map((row, index) => (
        <div
          key={row.label}
          className={`
            flex cursor-pointer items-center justify-between py-4
            ${index < rows.length - 1 ? 'border-b border-border' : ''}
          `}
          onClick={row.onClick}
        >
          <span className={`text-h3 font-semibold ${row.highlight ? 'text-brand' : ''}`}>{row.label}</span>
          <ChevronRight size={18} className={row.highlight ? 'text-brand' : 'text-text-muted'} />
        </div>
      ))}
    </GlassCard>
  );
};

interface SafetyThresholdsCardProps {
  maxTurbidity: number;
  fishChangePct: number;
  onTurbidityChange: (value: number) => void;
  onTurbidityCommit: (value: number) => void;
  onFishPctChange: (value: number) => void;
  onFishPctCommit: (value: number) => void;
}

export const SafetyThresholdsCard: React.FC<SafetyThresholdsCardProps> = ({
  maxTurbidity,
  fishChangePct,
  onTurbidityChange,
  onTurbidityCommit,
  onFishPctChange,
  onFishPctCommit,
}) => (
  <GlassCard className="p-5">
    <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-text">
      <ShieldCheck size={16} className="text-brand" /> Safety Boundaries & Notification Thresholds
    </h4>
    <SettingsRangeControl
      label="Maximum FNU Threshold"
      value={maxTurbidity}
      displayValue={`${maxTurbidity} FNU`}
      min="1.0"
      max="10.0"
      step="0.5"
      parser="float"
      onChange={onTurbidityChange}
      onCommit={onTurbidityCommit}
    />
    <SettingsRangeControl
      label="Discrepancy Alarm Trigger"
      value={fishChangePct}
      displayValue={`${fishChangePct}% visibility`}
      min="20"
      max="80"
      step="10"
      onChange={onFishPctChange}
      onCommit={onFishPctCommit}
    />
  </GlassCard>
);

interface DisconnectTankCardProps {
  activeTank?: TankBrief | null;
  showConfirmUnlink: boolean;
  onRequestUnlink: () => void;
  onCancelUnlink: () => void;
  onConfirmUnlink: () => void;
}

export const DisconnectTankCard: React.FC<DisconnectTankCardProps> = ({
  activeTank,
  showConfirmUnlink,
  onRequestUnlink,
  onCancelUnlink,
  onConfirmUnlink,
}) => (
  showConfirmUnlink ? (
    <GlassCard className="border-critical/30 p-5">
      <strong className="text-sm text-critical">Are you sure you want to disconnect?</strong>
      <p className="m-0 text-xs leading-[140%] text-text-muted">
        This will remove "{activeTank?.name}" from your active monitoring dashboard. You can reconnect it later using the reference code: <code>{activeTank?.id}</code>.
      </p>
      <div className="mt-1 flex gap-2.5">
        <GlassButton variant="outline" size="sm" onClick={onCancelUnlink}>Cancel</GlassButton>
        <GlassButton variant="danger" size="sm" onClick={onConfirmUnlink}>Yes, Disconnect</GlassButton>
      </div>
    </GlassCard>
  ) : (
    <GlassButton
      variant="outline"
      className="border-critical/20 text-critical hover:bg-critical/5"
      fullWidth
      onClick={onRequestUnlink}
    >
      Disconnect from Tank
    </GlassButton>
  )
);
