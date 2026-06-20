// inferenceHelpers.ts - Small, pure-ish helpers shared by AI/camera hooks.
import type { CameraFeedConfig, DateRange, LiveState, ReadingItem } from '../../types/aquarium';
import { isVideoReady, captureFrame } from '../api/aiApi';
import { getSnapshot, safeSetItem, notifyUpdate } from '../repositories/storageBase';
import { combineDateTime } from '../../utils/formatters';
import {
  DIAGNOSIS_COOLDOWN_MS,
  LAST_DIAGNOSIS_TIME_KEY,
} from '../../utils/constants';

// ---------------------------------------------------------------------------
// History filtering
// ---------------------------------------------------------------------------

export interface TimestampedRecord {
  timestamp: string;
}

export function recordInRange(record: TimestampedRecord, range: DateRange): boolean {
  const ts = new Date(record.timestamp);
  const start = combineDateTime(range.startDate, range.startTime);
  const end = combineDateTime(range.endDate, range.endTime);
  return ts >= start && ts <= end;
}

// ---------------------------------------------------------------------------
// Frame capture
// ---------------------------------------------------------------------------

export { isVideoReady };

export async function captureVideoFrame(
  video: HTMLVideoElement,
  quality: number = 0.92
): Promise<Blob> {
  if (!isVideoReady(video)) {
    throw new Error('Video element is not ready for frame capture');
  }
  return captureFrame(video, quality);
}

// ---------------------------------------------------------------------------
// Feed metrics
// ---------------------------------------------------------------------------

export interface FeedMetrics {
  clarity: number;
  fishCount: number;
}

export const DEFAULT_FEED: CameraFeedConfig = {
  id: 'feed-default',
  name: 'Default Feed',
  stream_url: 'webcam:default',
  is_live: false,
  started_at: null,
  current_clarity: 0,
  current_fish_count: 0,
};

export function selectActiveFeedMetrics(
  liveState: LiveState | null,
  activeFeed: CameraFeedConfig | undefined,
  latestReading: ReadingItem | undefined
): FeedMetrics {
  const feed = activeFeed ?? DEFAULT_FEED;
  if (liveState?.is_live) {
    return {
      clarity: feed.current_clarity ?? latestReading?.clarity ?? 0,
      fishCount: feed.current_fish_count ?? latestReading?.fish_count ?? 0,
    };
  }
  return {
    clarity: latestReading?.clarity ?? 0,
    fishCount: latestReading?.fish_count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Diagnosis cooldown
// ---------------------------------------------------------------------------

export function getLastDiagnosisTime(): number {
  return getSnapshot<number>(LAST_DIAGNOSIS_TIME_KEY, 0);
}

export function shouldDiagnose(): boolean {
  return Date.now() - getLastDiagnosisTime() > DIAGNOSIS_COOLDOWN_MS;
}

export function recordDiagnosisTime(): void {
  const result = safeSetItem(LAST_DIAGNOSIS_TIME_KEY, Date.now().toString());
  if (result.success) notifyUpdate(LAST_DIAGNOSIS_TIME_KEY);
}
