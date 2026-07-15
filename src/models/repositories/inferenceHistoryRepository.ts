import type {
  AIDetectionResult,
  AITurbidityResult,
} from '../../types/aquarium';
import {
  getSnapshot,
  notifyUpdate,
  safeSetItem,
  subscribeToDb,
} from './storageBase';

const HISTORY_SCHEMA_VERSION = 'v1';
const MAX_DETECTION_RECORDS = 300;
const MAX_TURBIDITY_RECORDS = 100;
const EMPTY_DETECTION_HISTORY: AIDetectionResult[] = [];
const EMPTY_TURBIDITY_HISTORY: AITurbidityResult[] = [];

const detectionKey = (tankId: string) =>
  `oceaneyes_detection_history:${HISTORY_SCHEMA_VERSION}:${tankId}`;
const turbidityKey = (tankId: string) =>
  `oceaneyes_turbidity_history:${HISTORY_SCHEMA_VERSION}:${tankId}`;

function prependUniqueByTimestamp<T extends { timestamp: string }>(
  records: T[],
  record: T,
  limit: number
): T[] {
  return [
    record,
    ...records.filter((candidate) => candidate.timestamp !== record.timestamp),
  ].slice(0, limit);
}

function saveHistory<T>(key: string, records: T[]): void {
  const result = safeSetItem(key, JSON.stringify(records));
  if (result.success) notifyUpdate(key);
}

export function getDetectionHistory(tankId: string): AIDetectionResult[] {
  return getSnapshot(detectionKey(tankId), EMPTY_DETECTION_HISTORY);
}

export function appendDetectionHistory(
  tankId: string,
  record: AIDetectionResult
): void {
  saveHistory(
    detectionKey(tankId),
    prependUniqueByTimestamp(
      getDetectionHistory(tankId),
      record,
      MAX_DETECTION_RECORDS
    )
  );
}

export function subscribeDetectionHistory(
  tankId: string,
  callback: () => void
): () => void {
  return subscribeToDb(detectionKey(tankId), callback);
}

export function getTurbidityHistory(tankId: string): AITurbidityResult[] {
  return getSnapshot(turbidityKey(tankId), EMPTY_TURBIDITY_HISTORY);
}

export function appendTurbidityHistory(
  tankId: string,
  record: AITurbidityResult
): void {
  saveHistory(
    turbidityKey(tankId),
    prependUniqueByTimestamp(
      getTurbidityHistory(tankId),
      record,
      MAX_TURBIDITY_RECORDS
    )
  );
}

export function subscribeTurbidityHistory(
  tankId: string,
  callback: () => void
): () => void {
  return subscribeToDb(turbidityKey(tankId), callback);
}

export function subscribeInferenceHistory(
  tankId: string,
  callback: () => void
): () => void {
  const unsubscribeDetection = subscribeDetectionHistory(tankId, callback);
  const unsubscribeTurbidity = subscribeTurbidityHistory(tankId, callback);
  return () => {
    unsubscribeDetection();
    unsubscribeTurbidity();
  };
}

export function getLatestInferenceDate(tankId: string): string | null {
  const timestamps = [
    ...getDetectionHistory(tankId),
    ...getTurbidityHistory(tankId),
  ]
    .map((record) => Date.parse(record.timestamp))
    .filter(Number.isFinite);

  if (timestamps.length === 0) return null;
  return new Date(Math.max(...timestamps)).toISOString().slice(0, 10);
}

export function clearInferenceHistory(tankId: string): void {
  saveHistory(detectionKey(tankId), EMPTY_DETECTION_HISTORY);
  saveHistory(turbidityKey(tankId), EMPTY_TURBIDITY_HISTORY);
}
