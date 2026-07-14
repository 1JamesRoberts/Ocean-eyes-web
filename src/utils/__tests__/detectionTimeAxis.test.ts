import { describe, expect, it } from 'vitest';
import { createDetectionTimeAxis } from '../detectionTimeAxis';
import type { AIDetectionResult } from '../../types/aquarium';

function record(timestamp: string): AIDetectionResult {
  return {
    timestamp,
    models: { detection: { provider: 'test' }, species: { provider: 'test' } },
    detections: [],
    summary: { total_detections: 0, species_counts: {} },
  };
}

describe('createDetectionTimeAxis', () => {
  it('uses the full detection time range with evenly spaced ticks', () => {
    const axis = createDetectionTimeAxis([
      record('2026-07-14T10:00:00.000Z'),
      record('2026-07-14T11:00:00.000Z'),
    ]);

    expect(axis.domain).toEqual([
      Date.parse('2026-07-14T10:00:00.000Z'),
      Date.parse('2026-07-14T11:00:00.000Z'),
    ]);
    expect(axis.ticks).toEqual([
      Date.parse('2026-07-14T10:00:00.000Z'),
      Date.parse('2026-07-14T10:15:00.000Z'),
      Date.parse('2026-07-14T10:30:00.000Z'),
      Date.parse('2026-07-14T10:45:00.000Z'),
      Date.parse('2026-07-14T11:00:00.000Z'),
    ]);
  });
});
