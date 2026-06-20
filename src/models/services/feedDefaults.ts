// feedDefaults.ts - Shared camera feed defaults
import type { CameraFeedConfig } from '../../types/aquarium';

export const DEFAULT_FEED: CameraFeedConfig = {
  id: 'feed-main',
  name: 'Local Webcam',
  stream_url: 'webcam:default',
  is_live: false,
  started_at: null,
  current_clarity: 1.2,
  current_fish_count: 0,
  mock_image: '',
};
