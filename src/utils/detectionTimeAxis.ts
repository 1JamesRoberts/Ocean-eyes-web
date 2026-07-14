// detectionTimeAxis.ts - Shared continuous time-axis configuration for detection charts
import type { AIDetectionResult } from '../types/aquarium';

const TICK_COUNT = 5;
const MINIMUM_DOMAIN_MS = 60_000;

export interface DetectionTimeAxis {
  domain: readonly [number, number];
  ticks: number[];
}

/**
 * Creates one stable numeric time domain and set of labels for every detection chart.
 */
export function createDetectionTimeAxis(records: AIDetectionResult[]): DetectionTimeAxis {
  const timestamps = records
    .map((record) => Date.parse(record.timestamp))
    .filter((timestamp) => Number.isFinite(timestamp));

  if (timestamps.length === 0) {
    return { domain: [0, 1], ticks: [] };
  }

  let start = Math.min(...timestamps);
  let end = Math.max(...timestamps);

  if (start === end) {
    start -= MINIMUM_DOMAIN_MS / 2;
    end += MINIMUM_DOMAIN_MS / 2;
  }

  const interval = (end - start) / (TICK_COUNT - 1);
  const ticks = Array.from(
    { length: TICK_COUNT },
    (_, index) => Math.round(start + interval * index),
  );

  return { domain: [start, end], ticks };
}

export function formatChartTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}
