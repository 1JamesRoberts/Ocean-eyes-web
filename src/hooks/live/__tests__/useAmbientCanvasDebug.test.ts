// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AMBIENT_CANVAS_DEBUG_VALUES,
  useAmbientCanvasDebug,
} from '../useAmbientCanvasDebug';

describe('useAmbientCanvasDebug', () => {
  it('maps session values to the inherited canvas CSS variables', () => {
    const { result } = renderHook(() => useAmbientCanvasDebug());

    expect(result.current.values).toEqual(DEFAULT_AMBIENT_CANVAS_DEBUG_VALUES);
    expect(result.current.canvasStyle).toMatchObject({
      '--mobile-canvas-background': 'var(--role-bg-canvas)',
      '--mobile-ambient-opacity': '0.1',
      '--mobile-ambient-blur': '48px',
      '--mobile-ambient-fade-start': '50%',
      '--mobile-ambient-fade-end': '100%',
      '--mobile-hero-fade-start': '55%',
    });

    act(() => result.current.updateValue('sampleOpacity', 64));
    act(() => result.current.updateValue('blurRadius', 31));

    expect(result.current.canvasStyle).toMatchObject({
      '--mobile-ambient-opacity': '0.64',
      '--mobile-ambient-blur': '31px',
    });
  });

  it('keeps at least five percent between the fade stops', () => {
    const { result } = renderHook(() => useAmbientCanvasDebug());

    act(() => result.current.updateValue('fadeStart', 18));
    act(() => result.current.updateValue('fadeEnd', 20));
    expect(result.current.values.fadeEnd).toBe(23);

    act(() => result.current.updateValue('fadeStart', 80));
    expect(result.current.values.fadeStart).toBe(18);

    act(() => result.current.updateValue('heroFadeStart', 22));
    expect(result.current.values.heroFadeStart).toBe(22);
  });

  it('survives rerenders, resets explicitly, and returns to defaults on remount', () => {
    const first = renderHook(() => useAmbientCanvasDebug());

    act(() => first.result.current.updateValue('baseGrey', 186));
    first.rerender();
    expect(first.result.current.values.baseGrey).toBe(186);

    act(() => first.result.current.reset());
    expect(first.result.current.values).toEqual(DEFAULT_AMBIENT_CANVAS_DEBUG_VALUES);

    act(() => first.result.current.updateValue('baseGrey', 120));
    first.unmount();
    const second = renderHook(() => useAmbientCanvasDebug());
    expect(second.result.current.values.baseGrey).toBe(255);
  });
});
