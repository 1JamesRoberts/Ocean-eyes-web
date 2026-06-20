// feedMetricsService.ts - Pure derivation of displayed clarity / fish count
import type { CameraFeedConfig, LiveState, ReadingItem } from '../../types/aquarium';
import { DEFAULT_FEED } from './feedDefaults';

export interface FeedMetrics {
  clarity: number;
  fishCount: number;
}

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
