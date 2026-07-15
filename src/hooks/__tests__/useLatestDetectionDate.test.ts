// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useLatestDetectionDate } from '../useLatestDetectionDate';
import { appendDetectionHistory } from '../../models/repositories/inferenceHistoryRepository';
import { todayUTC } from '../../utils/formatters';
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

describe('useLatestDetectionDate', () => {
  it('returns null without loading or errors when disabled', () => {
    const { result } = renderHook(() =>
      useLatestDetectionDate(false, 'disabled-latest-tank')
    );
    expect(result.current.latestDate).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isFallback).toBe(false);
  });

  it('uses today when the device has no inference history', () => {
    const { result } = renderHook(() =>
      useLatestDetectionDate(true, 'empty-latest-tank')
    );
    expect(result.current.latestDate).toBe(todayUTC());
  });

  it('selects the latest stored inference date and reacts to new records', () => {
    const tankId = 'latest-history-tank';
    appendDetectionHistory(tankId, detectionRecord('2026-07-03T12:00:00.000Z'));
    const { result } = renderHook(() => useLatestDetectionDate(true, tankId));
    expect(result.current.latestDate).toBe('2026-07-03');

    act(() => {
      appendDetectionHistory(tankId, detectionRecord('2026-07-05T12:00:00.000Z'));
    });

    expect(result.current.latestDate).toBe('2026-07-05');
  });
});
