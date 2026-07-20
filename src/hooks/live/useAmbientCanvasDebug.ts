import { useCallback, useMemo, useState, type CSSProperties } from 'react';

export interface AmbientCanvasDebugValues {
  baseGrey: number;
  sampleOpacity: number;
  blurRadius: number;
  fadeStart: number;
  fadeEnd: number;
}

export type AmbientCanvasDebugKey = keyof AmbientCanvasDebugValues;

export const DEFAULT_AMBIENT_CANVAS_DEBUG_VALUES: AmbientCanvasDebugValues = {
  baseGrey: 240,
  sampleOpacity: 100,
  blurRadius: 48,
  fadeStart: 50,
  fadeEnd: 100,
};

const MIN_FADE_GAP = 5;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const normaliseValue = (
  current: AmbientCanvasDebugValues,
  key: AmbientCanvasDebugKey,
  value: number,
): number => {
  switch (key) {
    case 'baseGrey':
      return clamp(Math.round(value), 0, 255);
    case 'sampleOpacity':
      return clamp(Math.round(value), 0, 100);
    case 'blurRadius':
      return clamp(Math.round(value), 0, 48);
    case 'fadeStart':
      return clamp(Math.round(value), 0, Math.min(80, current.fadeEnd - MIN_FADE_GAP));
    case 'fadeEnd':
      return clamp(Math.round(value), Math.max(20, current.fadeStart + MIN_FADE_GAP), 100);
  }
};

type AmbientCanvasCssProperties = CSSProperties & {
  '--mobile-canvas-background': string;
  '--mobile-ambient-opacity': string;
  '--mobile-ambient-blur': string;
  '--mobile-ambient-fade-start': string;
  '--mobile-ambient-fade-end': string;
};

export const useAmbientCanvasDebug = () => {
  const [values, setValues] = useState<AmbientCanvasDebugValues>(
    DEFAULT_AMBIENT_CANVAS_DEBUG_VALUES,
  );

  const updateValue = useCallback((key: AmbientCanvasDebugKey, value: number) => {
    setValues((current) => ({
      ...current,
      [key]: normaliseValue(current, key, value),
    }));
  }, []);

  const reset = useCallback(() => {
    setValues(DEFAULT_AMBIENT_CANVAS_DEBUG_VALUES);
  }, []);

  const canvasStyle = useMemo<AmbientCanvasCssProperties>(() => ({
    '--mobile-canvas-background': `rgb(${values.baseGrey} ${values.baseGrey} ${values.baseGrey})`,
    '--mobile-ambient-opacity': String(values.sampleOpacity / 100),
    '--mobile-ambient-blur': `${values.blurRadius}px`,
    '--mobile-ambient-fade-start': `${values.fadeStart}%`,
    '--mobile-ambient-fade-end': `${values.fadeEnd}%`,
  }), [values]);

  return {
    values,
    updateValue,
    reset,
    canvasStyle,
  };
};
