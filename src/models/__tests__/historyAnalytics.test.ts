import { describe, expect, it } from 'vitest';
import { selectHeatmapRecords } from '../services/historyAnalytics';
import type { AIDetectionResult, DateRange } from '../../types/aquarium';

const range: DateRange = {
  startDate: '2026-07-13',
  endDate: '2026-07-13',
  startTime: '00:00',
  endTime: '23:55',
};

function prediction(timestamp: string): AIDetectionResult {
  return {
    timestamp,
    models: {
      detection: { provider: 'test' },
      species: { provider: 'test' },
    },
    detections: [],
    summary: { total_detections: 0, species_counts: {} },
  };
}

describe('selectHeatmapRecords', () => {
  it('adds the latest live prediction when history has not persisted it yet', () => {
    const latest = prediction('2026-07-13T12:00:00.000Z');

    expect(selectHeatmapRecords([], latest, range)).toEqual([latest]);
  });

  it('does not duplicate a live prediction already returned by history', () => {
    const latest = prediction('2026-07-13T12:00:00.000Z');
    const records = [latest];

    expect(selectHeatmapRecords(records, latest, range)).toBe(records);
  });

  it('ignores a live prediction outside the selected range', () => {
    const records = [prediction('2026-07-13T08:00:00.000Z')];
    const latest = prediction('2026-07-14T08:00:00.000Z');

    expect(selectHeatmapRecords(records, latest, range)).toBe(records);
  });
});
