import React, { useState } from 'react';
import { Bug, RotateCcw } from 'lucide-react';
import type {
  AmbientCanvasDebugKey,
  AmbientCanvasDebugValues,
} from '../../hooks/live/useAmbientCanvasDebug';
import { GlassButton, GlassDisclosurePanel, SliderControl } from '../shared';

export interface BackgroundCanvasDebugPanelProps {
  values: AmbientCanvasDebugValues;
  onChange: (key: AmbientCanvasDebugKey, value: number) => void;
  onReset: () => void;
}

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
        <SliderControl
          label="Base grey"
          value={values.baseGrey}
          displayValue={greyHex(values.baseGrey)}
          min={0}
          max={255}
          step={1}
          onChange={(value) => onChange('baseGrey', value)}
        />
        <SliderControl
          label="Sample opacity"
          value={values.sampleOpacity}
          displayValue={`${values.sampleOpacity}%`}
          min={0}
          max={100}
          step={1}
          onChange={(value) => onChange('sampleOpacity', value)}
        />
        <SliderControl
          label="Blur radius"
          value={values.blurRadius}
          displayValue={`${values.blurRadius}px`}
          min={0}
          max={48}
          step={1}
          onChange={(value) => onChange('blurRadius', value)}
        />
        <SliderControl
          label="Fade start"
          value={values.fadeStart}
          displayValue={`${values.fadeStart}%`}
          min={0}
          max={Math.min(80, values.fadeEnd - 5)}
          step={1}
          onChange={(value) => onChange('fadeStart', value)}
        />
        <SliderControl
          label="Fade end"
          value={values.fadeEnd}
          displayValue={`${values.fadeEnd}%`}
          min={Math.max(20, values.fadeStart + 5)}
          max={100}
          step={1}
          onChange={(value) => onChange('fadeEnd', value)}
        />
        <SliderControl
          label="Hero fade start"
          value={values.heroFadeStart}
          displayValue={`${values.heroFadeStart}%`}
          min={0}
          max={80}
          step={1}
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
