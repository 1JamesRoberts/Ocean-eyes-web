import React, { useState } from 'react';
import { Bug, RotateCcw } from 'lucide-react';
import type {
  AmbientCanvasDebugKey,
  AmbientCanvasDebugValues,
} from '../../hooks/live/useAmbientCanvasDebug';
import { GlassButton, GlassDisclosurePanel } from '../shared';

export interface BackgroundCanvasDebugPanelProps {
  values: AmbientCanvasDebugValues;
  onChange: (key: AmbientCanvasDebugKey, value: number) => void;
  onReset: () => void;
}

interface DebugSliderProps {
  label: string;
  value: number;
  displayValue: string;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

const DebugSlider: React.FC<DebugSliderProps> = ({
  label,
  value,
  displayValue,
  min,
  max,
  onChange,
}) => (
  <label
    className="
      block rounded-2xl border border-white/20 bg-white/20 p-2.5 pb-2
    "
  >
    <span className="mb-1.5 flex items-baseline justify-between gap-3">
      <span className="type-body-muted">{label}</span>
      <strong className="type-body text-accent-ink">{displayValue}</strong>
    </span>
    <input
      type="range"
      aria-label={label}
      min={min}
      max={max}
      step="1"
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="w-full accent-verdigris"
    />
  </label>
);

const greyHex = (value: number) => {
  const channel = value.toString(16).padStart(2, '0');
  return `#${channel}${channel}${channel}`;
};

export const BackgroundCanvasDebugPanel: React.FC<BackgroundCanvasDebugPanelProps> = ({
  values,
  onChange,
  onReset,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <GlassDisclosurePanel
      icon={Bug}
      title="Background Canvas"
      detail="Video and background transition controls"
      expanded={expanded}
      onToggle={() => setExpanded((current) => !current)}
      iconClassName="text-warning"
    >
      <div className="flex flex-col gap-3">
        <DebugSlider
          label="Base grey"
          value={values.baseGrey}
          displayValue={greyHex(values.baseGrey)}
          min={0}
          max={255}
          onChange={(value) => onChange('baseGrey', value)}
        />
        <DebugSlider
          label="Sample opacity"
          value={values.sampleOpacity}
          displayValue={`${values.sampleOpacity}%`}
          min={0}
          max={100}
          onChange={(value) => onChange('sampleOpacity', value)}
        />
        <DebugSlider
          label="Blur radius"
          value={values.blurRadius}
          displayValue={`${values.blurRadius}px`}
          min={0}
          max={48}
          onChange={(value) => onChange('blurRadius', value)}
        />
        <DebugSlider
          label="Fade start"
          value={values.fadeStart}
          displayValue={`${values.fadeStart}%`}
          min={0}
          max={Math.min(80, values.fadeEnd - 5)}
          onChange={(value) => onChange('fadeStart', value)}
        />
        <DebugSlider
          label="Fade end"
          value={values.fadeEnd}
          displayValue={`${values.fadeEnd}%`}
          min={Math.max(20, values.fadeStart + 5)}
          max={100}
          onChange={(value) => onChange('fadeEnd', value)}
        />
        <DebugSlider
          label="Hero fade start"
          value={values.heroFadeStart}
          displayValue={`${values.heroFadeStart}%`}
          min={0}
          max={80}
          onChange={(value) => onChange('heroFadeStart', value)}
        />
        <GlassButton
          variant="outline"
          size="sm"
          onClick={onReset}
          className="
            self-start
          "
        >
          <RotateCcw size={13} aria-hidden="true" />
          Reset defaults
        </GlassButton>
      </div>
    </GlassDisclosurePanel>
  );
};
