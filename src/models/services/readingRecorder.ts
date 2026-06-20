// readingRecorder.ts - Coordinator for recording readings and feed metrics
import type { CameraFeedConfig, LiveState } from '../../types/aquarium';
import { writeReading } from '../repositories/readingRepository';
import { saveLiveState } from '../repositories/liveStateRepository';

export interface RecordFeedReadingInput {
  tankId: string;
  liveState: LiveState;
  activeFeed: CameraFeedConfig;
  clarity: number;
  fishCount: number;
}

export function recordFeedReading({
  tankId,
  liveState,
  activeFeed,
  clarity,
  fishCount,
}: RecordFeedReadingInput): void {
  writeReading({
    tankId,
    clarity,
    fishCount,
  });

  const updatedFeeds = liveState.feeds.map((feed) => {
    if (feed.id === activeFeed.id) {
      return { ...feed, current_clarity: clarity, current_fish_count: fishCount };
    }
    return feed;
  });

  saveLiveState(tankId, {
    ...liveState,
    current_clarity: clarity,
    current_fish_count: fishCount,
    feeds: updatedFeeds,
  });
}
