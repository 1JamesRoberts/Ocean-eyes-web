// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useHistory } from '../useHistory';
import {
  appendDetectionHistory,
  appendTurbidityHistory,
} from '../../models/repositories/inferenceHistoryRepository';
import type { AIDetectionResult, AITurbidityResult } from '../../types/aquarium';

const range = {
  startDate: '2026-07-05',
  endDate: '2026-07-05',
  startTime: '00:00',
  endTime: '23:55',
};

function detectionRecord(timestamp: string): AIDetectionResult {
  return {
    timestamp,
    image_dimensions: { width: 640, height: 480 },
    models: {
      detection: { provider: 'wasm' },
      species: { provider: 'webgpu' },
    },
    detections: [],
    summary: { total_detections: 0, species_counts: {} },
  };
}

function turbidityRecord(timestamp: string): AITurbidityResult {
  return {
    timestamp,
    models: { turbidity: { provider: 'wasm' } },
    turbidity: {
      fnu: 0.1,
      top_class: '00-0.49',
      top_confidence: 0.95,
      all_probabilities: { '00-0.49': 0.95 },
    },
  };
}

describe('useHistory', () => {
  it('does nothing when disabled', () => {
    const { result } = renderHook(() => useHistory(range, false, 'disabled-tank'));
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.detectionData).toBeNull();
    expect(result.current.turbidityData).toBeNull();
    expect(result.current.isFallback).toBe(false);
  });

  it('reads and chronologically sorts on-device inference history', () => {
    const tankId = 'history-tank';
    appendDetectionHistory(tankId, detectionRecord('2026-07-05T10:05:00.000Z'));
    appendDetectionHistory(tankId, detectionRecord('2026-07-05T10:00:00.000Z'));
    appendDetectionHistory(tankId, detectionRecord('2026-07-06T10:00:00.000Z'));
    appendTurbidityHistory(tankId, turbidityRecord('2026-07-05T11:00:00.000Z'));

    const { result } = renderHook(() => useHistory(range, true, tankId));

    expect(result.current.detectionData?.records.map((record) => record.timestamp)).toEqual([
      '2026-07-05T10:00:00.000Z',
      '2026-07-05T10:05:00.000Z',
    ]);
    expect(result.current.turbidityData?.count).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it('reacts immediately when inference writes a new record', () => {
    const tankId = 'subscribed-history-tank';
    const { result } = renderHook(() => useHistory(range, true, tankId));
    expect(result.current.detectionData?.count).toBe(0);

    act(() => {
      appendDetectionHistory(tankId, detectionRecord('2026-07-05T12:00:00.000Z'));
    });

    expect(result.current.detectionData?.count).toBe(1);
  });
});
