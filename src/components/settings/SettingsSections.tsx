import React, { useState } from 'react';
import {
  Bell,
  Brain,
  ChevronRight,
  Fish,
  Monitor,
  Pencil,
  Save,
  ShieldAlert,
  ShieldCheck,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  GlassButton,
  GlassDisclosurePanel,
  GlassInput,
  GlassPanel,
  HeadedCard,
} from '../shared';
import { StreamAdjustments } from '../live/StreamAdjustments';
import {
  BackgroundCanvasDebugPanel,
  type BackgroundCanvasDebugPanelProps,
} from './BackgroundCanvasDebugPanel';
import type {
  AIPreferences,
  CameraFilters,
  LivePreferences,
  TankBrief,
} from '../../types/aquarium';

type RangeParser = 'int' | 'float' | 'percent';

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
    ${onClick ? 'cursor-pointer hover:bg-white/55' : ''}
    ${highlight ? 'border-focus/20 bg-accent/8' : ''}
    ${danger ? 'border-critical/20 bg-critical/8' : ''}
  `;
  const content = (
    <>
      <span className="flex min-w-0 items-center gap-3">
        {Icon && (
          <span
            className={`
              grid size-9 shrink-0 place-items-center rounded-full
              ${danger ? 'bg-critical/10 text-critical' : highlight ? 'text-accent-ink' : 'text-slate-grey'}
            `}
          >
            <Icon size={17} />
          </span>
        )}
        <span className="min-w-0">
          <span className={`block type-strong ${danger ? 'text-critical' : 'text-prussian-blue'}`}>
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

const SettingsRangeControl: React.FC<SettingsRangeControlProps> = ({
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
  const inputId = React.useId();

  const commitCurrentValue = (target: EventTarget & HTMLInputElement) => {
    onCommit(parseRangeValue(target.value, parser));
  };

  return (
    <div className={variant === 'panel' ? 'rounded-2xl border border-white/20 bg-white/20 p-2.5 pb-2' : ''}>
      <label htmlFor={inputId} className="mb-1.5 flex items-baseline justify-between gap-3 type-body">
        <span className="min-w-0 type-body-muted">{label}</span>
        <strong className="shrink-0 text-accent-ink">{displayValue}</strong>
      </label>
      <input
        id={inputId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(parseRangeValue(event.target.value, parser))}
        onMouseUp={(event) => commitCurrentValue(event.currentTarget)}
        onTouchEnd={(event) => commitCurrentValue(event.currentTarget)}
        className="w-full accent-verdigris"
      />
    </div>
  );
};

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
  const autoConnectLabelId = React.useId();
  const percentValue = (value: number) => Math.round(value * 100);

  return (
    <HeadedCard icon={ShieldCheck} title="Alerts & Thresholds">
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
          action={<ChevronRight size={18} className="text-slate-grey" />}
        />

        <GlassDisclosurePanel
          icon={Brain}
          title="AI Preferences"
          detail={`${preferences.autoConnect ? 'Auto-start enabled' : 'Auto-start disabled'}, ${preferences.ai.pollingIntervalMs / 1000}s polling`}
          expanded={aiExpanded}
          onToggle={() => setAiExpanded((current) => !current)}
        >
          <div className="flex items-center justify-between">
            <span id={autoConnectLabelId} className="pr-4 type-body-muted">
              Auto-start AI when stream connects
            </span>
            <button
              type="button"
              onClick={() => onAutoConnectChange(!preferences.autoConnect)}
              role="switch"
              aria-checked={preferences.autoConnect}
              aria-labelledby={autoConnectLabelId}
              className={`
                grid size-11 shrink-0 cursor-pointer place-items-center rounded-full
                border-none bg-transparent
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus
              `}
            >
              <span
                className={`
                  relative inline-flex h-6 w-11 rounded-full transition-colors
                  ${preferences.autoConnect ? 'bg-accent' : 'bg-slate-grey/20'}
                `}
                aria-hidden="true"
              >
                <span
                  className={`
                    absolute top-1 left-1 inline-block size-4 rounded-full bg-white transition-transform
                    ${preferences.autoConnect ? 'translate-x-5' : 'translate-x-0'}
                  `}
                />
              </span>
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
    </HeadedCard>
  );
};

interface AquariumPanelCardProps {
  activeTank?: TankBrief | null;
  editing: boolean;
  name: string;
  setName: (name: string) => void;
  handleNameChange: (event: React.FormEvent) => void;
  onStartRename: () => void;
  showConfirmUnlink: boolean;
  onRequestUnlink: () => void;
  onCancelUnlink: () => void;
  onConfirmUnlink: () => void;
  filters?: CameraFilters;
  onFilterChange?: (filters: Partial<CameraFilters>) => void;
  canvasDebug: BackgroundCanvasDebugPanelProps;
}

export const AquariumPanelCard: React.FC<AquariumPanelCardProps> = ({
  activeTank,
  editing,
  name,
  setName,
  handleNameChange,
  onStartRename,
  showConfirmUnlink,
  onRequestUnlink,
  onCancelUnlink,
  onConfirmUnlink,
  filters,
  onFilterChange,
  canvasDebug,
}) => (
  <HeadedCard icon={ShieldAlert} title="Tank Management">

    <div className="flex flex-col gap-3">
      {editing ? (
        <form onSubmit={handleNameChange} className="flex items-end gap-2.5 rounded-2xl border border-white/20 bg-white/20 p-2.5 pb-2">
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
        highlight
        action={<ChevronRight size={18} className="text-slate-grey" />}
      />

      {filters && onFilterChange && (
        <StreamAdjustments filters={filters} onFilterChange={onFilterChange} />
      )}

      <BackgroundCanvasDebugPanel {...canvasDebug} />

      {showConfirmUnlink ? (
        <div className="rounded-2xl border border-critical/20 bg-critical/8 p-2.5 pb-2">
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
          action={<ChevronRight size={18} className="text-slate-grey" />}
        />
      )}
    </div>
  </HeadedCard>
);
