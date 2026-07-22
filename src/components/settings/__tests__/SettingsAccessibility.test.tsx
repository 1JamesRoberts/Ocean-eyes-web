// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StreamAdjustments } from '../../live/StreamAdjustments';
import { SafetyThresholdsCard } from '../SettingsSections';

afterEach(cleanup);

const preferences = {
  cameraSource: { type: 'webcam' as const },
  defaultFilters: {
    contrast: 100,
    brightness: 100,
    saturation: 100,
    temperature: 0,
    tint: 0,
  },
  filterPresets: [],
  ai: {
    pollingIntervalMs: 5_000,
    detectionConfidenceThreshold: 0.5,
    speciesConfidenceThreshold: 0.6,
    diagnosisMinConfidence: 0.7,
    autoStart: false,
  },
  autoConnect: true,
};

describe('settings control accessibility', () => {
  it('gives safety and AI range controls accessible names', () => {
    render(
      <SafetyThresholdsCard
        maxTurbidity={6}
        fishChangePct={40}
        onNavigateToAlerts={vi.fn()}
        onTurbidityChange={vi.fn()}
        onTurbidityCommit={vi.fn()}
        onFishPctChange={vi.fn()}
        onFishPctCommit={vi.fn()}
        preferences={preferences}
        onAutoConnectChange={vi.fn()}
        onAIPreferenceChange={vi.fn()}
        onAIPreferenceCommit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Alert sensitivity/i }));
    fireEvent.click(screen.getByRole('button', { name: /AI Preferences/i }));

    expect(screen.getByRole('slider', { name: /Maximum FNU Threshold/ })).toBeTruthy();
    expect(screen.getByRole('slider', { name: /Discrepancy Alarm Trigger/ })).toBeTruthy();
    expect(screen.getByRole('slider', { name: /AI Polling Interval/ })).toBeTruthy();
    expect(screen.getByRole('slider', { name: /Detection Confidence Threshold/ })).toBeTruthy();
  });

  it('exposes auto-start as a named switch with its current state', () => {
    const onAutoConnectChange = vi.fn();
    render(
      <SafetyThresholdsCard
        maxTurbidity={6}
        fishChangePct={40}
        onNavigateToAlerts={vi.fn()}
        onTurbidityChange={vi.fn()}
        onTurbidityCommit={vi.fn()}
        onFishPctChange={vi.fn()}
        onFishPctCommit={vi.fn()}
        preferences={preferences}
        onAutoConnectChange={onAutoConnectChange}
        onAIPreferenceChange={vi.fn()}
        onAIPreferenceCommit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /AI Preferences/i }));

    const autoStartSwitch = screen.getByRole('switch', {
      name: 'Auto-start AI when stream connects',
    });
    expect(autoStartSwitch.getAttribute('aria-checked')).toBe('true');

    fireEvent.click(autoStartSwitch);
    expect(onAutoConnectChange).toHaveBeenCalledWith(false);
  });

  it('labels every stream adjustment and renders no empty action buttons', () => {
    render(
      <StreamAdjustments
        filters={preferences.defaultFilters}
        onFilterChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Stream Image Adjustments/i }));

    [/^Contrast/i, /^Brightness/i, /^Saturation/i, /^Temperature \(Cool \/ Warm\)/i, /^Tint \(Green \/ Magenta\)/i]
      .forEach((name) => expect(screen.getByRole('slider', { name })).toBeTruthy());

    expect(screen.queryByRole('button', { name: '' })).toBeNull();
  });
});
