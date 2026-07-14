import React, { useState } from 'react';
import {
  Bell,
  Brain,
  ChevronDown,
  ChevronRight,
  Fish,
  FolderOpen,
  Monitor,
  Pencil,
  RotateCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Video,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  CardSectionHeader,
  GlassButton,
  GlassCard,
  GlassDisclosurePanel,
  GlassInput,
  GlassPanel,
} from '../shared';
import { StreamAdjustments } from '../live/StreamAdjustments';
import type {
  AIPreferences,
  CameraFilters,
  FilterPreset,
  LivePreferences,
  TankBrief,
} from '../../types/aquarium';

type RangeParser = 'int' | 'float' | 'percent';

interface SettingsCardTitleProps {
  icon: LucideIcon;
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
}

const SettingsCardTitle: React.FC<SettingsCardTitleProps> = ({
  icon: Icon,
  title,
  eyebrow,
  action,
}) => (
  <CardSectionHeader
    icon={Icon}
    title={title}
    detail={eyebrow}
    action={action}
  />
);

interface SettingsPanelRowProps {
  icon?: LucideIcon;
  title: React.ReactNode;
  detail?: React.ReactNode;
  action?: React.ReactNode;
  onClick?: () => void;
  highlight?: boolean;
  danger?: boolean;
}

const SettingsPanelRow: React.FC<SettingsPanelRowProps> = ({
  icon: Icon,
  title,
  detail,
  action,
  onClick,
  highlight = false,
  danger = false,
}) => {
  const className = `
    flex items-center justify-between gap-3 text-left
    ${onClick ? 'cursor-pointer hover:bg-white/55 active:scale-[0.99]' : ''}
    ${highlight ? 'border-brand/20 bg-brand/8' : ''}
    ${danger ? 'border-critical/20 bg-critical/8' : ''}
  `;
  const content = (
    <>
      <span className="flex min-w-0 items-center gap-3">
        {Icon && (
          <span
            className={`
              grid size-9 shrink-0 place-items-center rounded-full
              ${danger ? 'bg-critical/10 text-critical' : highlight ? 'text-brand' : 'text-text-muted'}
            `}
          >
            <Icon size={17} />
          </span>
        )}
        <span className="min-w-0">
          <span className={`block type-strong ${danger ? 'text-critical' : 'text-text'}`}>
            {title}
          </span>
          {detail && (
            <span className="mt-0.5 block type-caption">{detail}</span>
          )}
        </span>
      </span>
      {action && <span className="shrink-0">{action}</span>}
    </>
  );

  return onClick ? (
    <GlassPanel
      as="button"
      type="button"
      onClick={onClick}
      className={className}
    >
      {content}
    </GlassPanel>
  ) : (
    <GlassPanel className={className}>
      {content}
    </GlassPanel>
  );
};

interface SettingsDisclosureButtonProps {
  expanded: boolean;
  onClick: () => void;
  label: string;
}

const SettingsDisclosureButton: React.FC<SettingsDisclosureButtonProps> = ({
  expanded,
  onClick,
  label,
}) => (
  <button
    type="button"
    onClick={onClick}
    className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/20 px-3 py-2.5 type-caption transition-smooth hover:bg-white/45"
    aria-expanded={expanded}
  >
    {label}
    <ChevronDown
      size={15}
      className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
    />
  </button>
);

interface SettingsRangeControlProps {
  label: string;
  value: number;
  displayValue: React.ReactNode;
  min: number | string;
  max: number | string;
  step: number | string;
  parser?: RangeParser;
  variant?: 'panel' | 'inline';
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
  variant = 'panel',
  onChange,
  onCommit,
}) => {
  const commitCurrentValue = (target: EventTarget & HTMLInputElement) => {
    onCommit(parseRangeValue(target.value, parser));
  };

  return (
    <div className={variant === 'panel' ? 'rounded-2xl border border-white/20 bg-white/20 p-3' : ''}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 type-body">
        <span className="min-w-0 type-body-muted">{label}</span>
        <strong className="shrink-0 text-brand">{displayValue}</strong>
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
  const [expanded, setExpanded] = useState(false);
  const metrics = [
    { label: 'Contrast', value: `${defaultFilters.contrast}%` },
    { label: 'Brightness', value: `${defaultFilters.brightness}%` },
    { label: 'Saturation', value: `${defaultFilters.saturation}%` },
    { label: 'Temperature', value: defaultFilters.temperature },
    { label: 'Tint', value: defaultFilters.tint },
  ];

  return (
    <GlassCard className="p-5">
      <SettingsCardTitle
        icon={SlidersHorizontal}
        eyebrow="Adjust camera image"
        title="Camera Filters"
        action={(
          <GlassButton variant="outline" size="sm" onClick={resetToDefaults} className="px-2.5">
            <RotateCcw size={12} />
            Reset
          </GlassButton>
        )}
      />

      <div className="grid grid-cols-2 gap-2.5 type-body">
        {metrics.map((metric) => (
          <GlassPanel key={metric.label}>
            <span className="block type-caption">{metric.label}</span>
            <strong className="text-text">{metric.value}</strong>
          </GlassPanel>
        ))}
      </div>

      {expanded && (
        <div className="mt-4">
          <h5 className="mb-2 type-caption">Saved Presets</h5>
          {filterPresets.length === 0 ? (
            <p className="type-body-muted">No custom presets saved.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {filterPresets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 type-caption"
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

          <p className="mt-3 type-caption">
            Adjust filters in the live preview above, then save the current look as a preset or as the default filter.
          </p>
        </div>
      )}

      <SettingsDisclosureButton
        expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
        label={expanded ? 'Hide presets' : 'Show presets'}
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
      <SettingsCardTitle icon={FolderOpen} eyebrow="Manage saved media" title="Media Storage" />
      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <SettingsPanelRow
            key={row.label}
            icon={Video}
            title={row.label}
            detail={`${row.count} saved`}
            action={(
              <GlassButton variant="outline" size="sm" onClick={row.onClear} disabled={row.count === 0}>
                <Trash2 size={12} />
                Clear
              </GlassButton>
            )}
          />
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
    <SettingsCardTitle icon={ShieldCheck} eyebrow="View tank details" title="Tank Identity" />
    <GlassPanel className="mb-3 type-caption">
      <span>Tank Reference Code: </span>
      <code className="ml-1 align-baseline type-caption">
        {activeTank?.id}
      </code>
    </GlassPanel>
    {editing ? (
      <form onSubmit={handleNameChange} className="flex items-end gap-2.5">
        <GlassInput
          id="tank-name"
          label="Tank name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <GlassButton variant="primary" size="sm" type="submit">
          <Save size={12} />
          Save
        </GlassButton>
      </form>
    ) : (
      <SettingsPanelRow
        title={activeTank?.name}
        detail="Tank name"
        action={(
          <GlassButton variant="outline" size="sm" onClick={onStartRename}>
            <Pencil size={12} />
            Rename
          </GlassButton>
        )}
      />
    )}
  </GlassCard>
);

interface SafetyThresholdsCardProps {
  maxTurbidity: number;
  fishChangePct: number;
  onNavigateToAlerts: () => void;
  onTurbidityChange: (value: number) => void;
  onTurbidityCommit: (value: number) => void;
  onFishPctChange: (value: number) => void;
  onFishPctCommit: (value: number) => void;
  preferences: LivePreferences;
  onAutoConnectChange: (autoConnect: boolean) => void;
  onAIPreferenceChange: (patch: Partial<AIPreferences>) => void;
  onAIPreferenceCommit: (patch: Partial<AIPreferences>) => void;
}

export const SafetyThresholdsCard: React.FC<SafetyThresholdsCardProps> = ({
  maxTurbidity,
  fishChangePct,
  onNavigateToAlerts,
  onTurbidityChange,
  onTurbidityCommit,
  onFishPctChange,
  onFishPctCommit,
  preferences,
  onAutoConnectChange,
  onAIPreferenceChange,
  onAIPreferenceCommit,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [aiExpanded, setAiExpanded] = useState(false);
  const percentValue = (value: number) => Math.round(value * 100);

  return (
    <GlassCard className="p-5">
      <SettingsCardTitle icon={ShieldCheck} eyebrow="Set safety limits" title="Alerts & Thresholds" />
      <div className="flex flex-col gap-3">
        <GlassDisclosurePanel
          icon={Bell}
          title="Alert sensitivity"
          detail={`${maxTurbidity} FNU turbidity max, ${fishChangePct}% fish visibility change`}
          expanded={expanded}
          onToggle={() => setExpanded((current) => !current)}
        >
          <SettingsRangeControl
            label="Maximum FNU Threshold"
            value={maxTurbidity}
            displayValue={`${maxTurbidity} FNU`}
            min="1.0"
            max="10.0"
            step="0.5"
            parser="float"
            variant="inline"
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
            variant="inline"
            onChange={onFishPctChange}
            onCommit={onFishPctCommit}
          />
        </GlassDisclosurePanel>
        <SettingsPanelRow
          icon={Bell}
          title="Safety Alert Logs"
          detail="Warnings and event history"
          onClick={onNavigateToAlerts}
          action={<ChevronRight size={18} className="text-text-muted" />}
        />

        <GlassDisclosurePanel
          icon={Brain}
          title="AI Preferences"
          detail={`${preferences.autoConnect ? 'Auto-start enabled' : 'Auto-start disabled'}, ${preferences.ai.pollingIntervalMs / 1000}s polling`}
          expanded={aiExpanded}
          onToggle={() => setAiExpanded((current) => !current)}
        >
          <div className="flex items-center justify-between">
            <span className="pr-4 type-body-muted">Auto-start AI when stream connects</span>
            <button
              onClick={() => onAutoConnectChange(!preferences.autoConnect)}
              className={`
                relative inline-flex h-6 w-11 cursor-pointer rounded-full border-none transition-colors
                ${preferences.autoConnect ? 'bg-brand' : 'bg-text/20'}
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
            variant="inline"
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
            variant="inline"
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
            variant="inline"
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
            variant="inline"
            onChange={(value) => onAIPreferenceChange({ diagnosisMinConfidence: value })}
            onCommit={(value) => onAIPreferenceCommit({ diagnosisMinConfidence: value })}
          />
        </GlassDisclosurePanel>
      </div>
    </GlassCard>
  );
};

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
      <SettingsCardTitle icon={X} eyebrow="Disconnect this tank" title="Remove Active Tank" />
      <p className="m-0 type-caption">
        This will remove "{activeTank?.name}" from your active monitoring dashboard. You can reconnect it later using the reference code: <code>{activeTank?.id}</code>.
      </p>
      <div className="mt-4 flex gap-2.5">
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

interface AquariumPanelCardProps extends TankIdentityCardProps, DisconnectTankCardProps {
  onNavigateToMonitor: () => void;
  filters?: CameraFilters;
  onFilterChange?: (filters: Partial<CameraFilters>) => void;
}

export const AquariumPanelCard: React.FC<AquariumPanelCardProps> = ({
  activeTank,
  editing,
  name,
  setName,
  handleNameChange,
  onStartRename,
  onNavigateToMonitor,
  showConfirmUnlink,
  onRequestUnlink,
  onCancelUnlink,
  onConfirmUnlink,
  filters,
  onFilterChange,
}) => (
  <GlassCard className="p-5">
    <SettingsCardTitle icon={ShieldAlert} eyebrow="Manage this aquarium" title="Tank Management" />

    <div className="flex flex-col gap-3">
      {editing ? (
        <form onSubmit={handleNameChange} className="flex items-end gap-2.5 rounded-2xl border border-white/20 bg-white/20 p-3">
          <GlassInput
            id="tank-name"
            label="Tank name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <GlassButton variant="primary" size="sm" type="submit">
            <Save size={12} />
            Save
          </GlassButton>
        </form>
      ) : (
        <SettingsPanelRow
          icon={Fish}
          title={activeTank?.name}
          detail={(
            <>
              Ref Code:{' '}
              <code className="align-baseline type-caption">
                {activeTank?.id}
              </code>
            </>
          )}
          action={(
            <GlassButton variant="outline" size="sm" onClick={onStartRename}>
              <Pencil size={12} />
              Rename
            </GlassButton>
          )}
        />
      )}

      <SettingsPanelRow
        icon={Monitor}
        title="IoT Scanner Console"
        detail="Pair or review monitor hardware"
        onClick={onNavigateToMonitor}
        highlight
        action={<ChevronRight size={18} className="text-brand" />}
      />

      {filters && onFilterChange && (
        <StreamAdjustments filters={filters} onFilterChange={onFilterChange} />
      )}

      {showConfirmUnlink ? (
        <div className="rounded-2xl border border-critical/20 bg-critical/8 p-3">
          <p className="m-0 type-caption">
            This will remove "{activeTank?.name}" from your active monitoring dashboard. You can reconnect it later using the reference code: <code>{activeTank?.id}</code>.
          </p>
          <div className="mt-3 flex gap-2.5">
            <GlassButton variant="outline" size="sm" onClick={onCancelUnlink}>Cancel</GlassButton>
            <GlassButton variant="danger" size="sm" onClick={onConfirmUnlink}>Yes, Disconnect</GlassButton>
          </div>
        </div>
      ) : (
        <SettingsPanelRow
          icon={X}
          title="Disconnect from Tank"
          detail="Remove this tank from the active dashboard"
          onClick={onRequestUnlink}
          danger
          action={<ChevronRight size={18} className="text-critical" />}
        />
      )}
    </div>
  </GlassCard>
);
