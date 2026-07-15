// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import {
  AnalyticsControlsProvider,
  useAnalyticsControls,
} from '../AnalyticsControlsContext';
import {
  appendDetectionHistory,
  clearInferenceHistory,
} from '../../models/repositories/inferenceHistoryRepository';
import { DEMO_TANK_ID } from '../../models/repositories/storageBase';
import type { AIDetectionResult } from '../../types/aquarium';

function detectionRecord(timestamp: string): AIDetectionResult {
  return {
    timestamp,
    models: {
      detection: { provider: 'wasm' },
      species: { provider: 'webgpu' },
    },
    detections: [],
    summary: { total_detections: 0, species_counts: {} },
  };
}

const Probe = () => {
  const { range, isInitialLoading, detectionData } = useAnalyticsControls();
  return (
    <output data-testid="analytics-state">
      {`${range.startDate}|${isInitialLoading}|${detectionData?.count ?? 'pending'}`}
    </output>
  );
};

describe('AnalyticsControlsProvider', () => {
  const originalUrl = window.location.href;

  beforeEach(() => {
    clearInferenceHistory(DEMO_TANK_ID);
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', originalUrl);
  });

  it('selects the latest date from on-device history', async () => {
    appendDetectionHistory(
      DEMO_TANK_ID,
      detectionRecord('2026-07-03T12:00:00.000Z')
    );

    render(
      <AnalyticsControlsProvider active>
        <Probe />
      </AnalyticsControlsProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('analytics-state').textContent).toBe(
        '2026-07-03|false|1'
      )
    );
  });

  it('uses URL ranges immediately without network requests', async () => {
    window.history.replaceState(
      null,
      '',
      '/?start=2026-06-01T00%3A00&end=2026-06-02T23%3A55'
    );

    render(
      <AnalyticsControlsProvider active>
        <Probe />
      </AnalyticsControlsProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('analytics-state').textContent).toBe(
        '2026-06-01|false|0'
      )
    );
  });
});
