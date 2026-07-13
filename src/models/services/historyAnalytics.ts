// historyAnalytics.ts - Pure selectors for AI inference history analytics
import type {
  AIDetectionResult,
  AIDetection,
  DateRange,
  FishDiagnosis,
  FishEntry,
} from '../../types/aquarium';
import { recordInRange } from './inferenceHelpers';

export interface DiagnosisViewModel {
  timestamp: string;
  species: string;
  cropUrl: string | undefined;
  diagnosis: FishDiagnosis;
}

export function selectDiagnoses(records: AIDetectionResult[]): DiagnosisViewModel[] {
  return records
    .flatMap((record) =>
      record.detections
        .filter((det): det is AIDetection & { diagnosis: FishDiagnosis } => !!det.diagnosis)
        .map((det) => ({
          timestamp: record.timestamp,
          species: det.species_display,
          cropUrl: det.diagnosis.crop_url,
          diagnosis: det.diagnosis,
        }))
    )
    .reverse();
}

export function selectSpeciesList(
  records: AIDetectionResult[],
  fishList: FishEntry[]
): string[] {
  const detected = new Set(records.flatMap((r) => r.detections.map((d) => d.species)));
  const inventory = new Set(fishList.map((f) => f.speciesId));
  return Array.from(new Set([...detected, ...inventory]));
}

/**
 * Keep the hero heatmap current between history writes by including the latest
 * live prediction when it belongs to the selected analytics range.
 */
export function selectHeatmapRecords(
  records: AIDetectionResult[],
  latestPrediction: AIDetectionResult | null | undefined,
  range: DateRange,
): AIDetectionResult[] {
  if (!latestPrediction || !recordInRange(latestPrediction, range)) return records;
  if (records.some((record) => record.timestamp === latestPrediction.timestamp)) return records;
  return [...records, latestPrediction];
}
