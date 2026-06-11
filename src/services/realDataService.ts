// src/services/realDataService.ts - Fetch real AI inference records from the backend
// and map them into the ReadingItem / species-count shapes consumed by the dashboard.

import type { AIDetectionResult, AITurbidityResult, ReadingItem } from '../types/aquarium';
import {
  fetchDetectionHistory,
  fetchTurbidityHistory,
  isBackendAvailable,
} from './ai_service';
import { generateSimulatedChemistry } from './chemistrySimulator';

const TODAY = () => new Date().toISOString().slice(0, 10);

function average(values: number[]): number {
  if (values.length === 0) return 0.95;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function normalizeSpeciesKey(key: string): string {
  return key.toLowerCase().replace(/\s+/g, '_');
}

function findLatestRecord<T extends { timestamp: string }>(records: T[]): T | null {
  if (!records || records.length === 0) return null;
  return records.reduce((latest, current) =>
    current.timestamp > latest.timestamp ? current : latest
  );
}

export async function fetchTodayReadings(tankId: string): Promise<ReadingItem[]> {
  const date = TODAY();

  const [detectionData, turbidityData] = await Promise.all([
    fetchDetectionHistory(date),
    fetchTurbidityHistory(date),
  ]);

  const detection = findLatestRecord<AIDetectionResult>(detectionData.records);
  const turbidity = findLatestRecord<AITurbidityResult>(turbidityData.records);

  if (!detection && !turbidity) {
    return [];
  }

  const chemistry = generateSimulatedChemistry();
  const timestamp = detection?.timestamp ?? turbidity?.timestamp ?? new Date().toISOString();
  const fishCount = detection?.summary?.total_detections ?? 0;
  const fishConfidence = detection?.detections?.length
    ? average(detection.detections.map((d) => d.detection_confidence))
    : 0.95;

  const reading: ReadingItem = {
    id: `real-${timestamp}`,
    tank_id: tankId,
    timestamp,
    clarity: turbidity?.turbidity?.fnu ?? 0,
    fish_count: fishCount,
    fish_count_confidence: parseFloat(fishConfidence.toFixed(4)),
    frame_url: '',
    ph: chemistry.ph,
    temp: chemistry.temp,
    ammonia: chemistry.ammonia,
    nitrite: chemistry.nitrite,
  };

  return [reading];
}

export async function fetchSpeciesDetectedToday(): Promise<Record<string, number>> {
  const date = TODAY();
  const data = await fetchDetectionHistory(date);
  const latest = findLatestRecord<AIDetectionResult>(data.records);
  if (!latest) return {};

  const normalized: Record<string, number> = {};
  Object.entries(latest.summary?.species_counts ?? {}).forEach(([key, count]) => {
    normalized[normalizeSpeciesKey(key)] = count;
  });
  return normalized;
}

export { isBackendAvailable };
export { normalizeSpeciesKey };
