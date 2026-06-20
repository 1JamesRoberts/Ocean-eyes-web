import { describe, it, expect } from 'vitest';
import { selectActiveFeedMetrics } from '../services/inferenceHelpers';
import type { CameraFeedConfig, LiveState, ReadingItem } from '../../types/aquarium';

describe('feedMetricsService', () => {
  const feed: CameraFeedConfig = {
    id: 'feed-1',
    name: 'Webcam',
    stream_url: 'webcam:default',
    is_live: true,
    started_at: null,
    current_clarity: 2.5,
    current_fish_count: 7,
  };

  const liveState: LiveState = {
    is_live: true,
    stream_url: 'webcam:default',
    started_at: null,
    last_ping_at: null,
    current_clarity: 2.5,
    current_fish_count: 7,
    selected_feed_id: 'feed-1',
    feeds: [feed],
  };

  const reading: ReadingItem = {
    id: 'r1',
    tank_id: 'tank-demo',
    timestamp: '2026-06-20T08:00:00Z',
    clarity: 1.2,
    fish_count: 5,
    fish_count_confidence: 0.9,
    frame_url: '',
  };

  it('prefers live feed metrics when live', () => {
    const metrics = selectActiveFeedMetrics(liveState, feed, reading);
    expect(metrics.clarity).toBe(2.5);
    expect(metrics.fishCount).toBe(7);
  });

  it('falls back to the latest reading when not live', () => {
    const metrics = selectActiveFeedMetrics(
      { ...liveState, is_live: false },
      feed,
      reading
    );
    expect(metrics.clarity).toBe(1.2);
    expect(metrics.fishCount).toBe(5);
  });

  it('returns zeros when no data is available', () => {
    const metrics = selectActiveFeedMetrics(null, undefined, undefined);
    expect(metrics.clarity).toBe(0);
    expect(metrics.fishCount).toBe(0);
  });

  it('falls back from feed to reading when feed values are missing', () => {
    const feedWithMissing = { ...feed, current_clarity: undefined as unknown as number };
    const metrics = selectActiveFeedMetrics(liveState, feedWithMissing, reading);
    expect(metrics.clarity).toBe(1.2);
  });
});
