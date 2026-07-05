import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import {
  getLiveState,
  saveLiveState as saveLiveStateToRepository,
  updateCalibration as updateCalibrationInRepository,
  subscribeLiveState,
} from '../models/repositories/storageBase';
import { useLivePreferences } from './useLivePreferences';
import type { CameraFeedConfig, CameraSourcePreference, LiveState } from '../types/aquarium';

export interface UseLiveFeedViewModelResult {
  liveState: LiveState | null;
  activeFeed: CameraFeedConfig;
  isWebcam: boolean;
  isStreaming: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  webcamStream: MediaStream | null;
  saveLiveState: (state: LiveState) => void;
  startStream: () => void;
  updateCalibration: (waterLineY: number) => void;
}

const DEFAULT_FEED: CameraFeedConfig = {
  id: 'feed-main',
  name: 'Local Webcam',
  stream_url: 'webcam:default',
  is_live: false,
  started_at: null,
  current_clarity: 1.2,
  current_fish_count: 0,
  mock_image: ''
};

const buildStreamUrl = (source: CameraSourcePreference): string => {
  if (source.type === 'mock') return 'mock:/mock_camera_main.png';
  if (source.deviceId && source.deviceId !== 'default') return `webcam:${source.deviceId}`;
  return 'webcam:default';
};

export const useLiveFeed = (tankId: string | null): UseLiveFeedViewModelResult => {
  const { preferences } = useLivePreferences(tankId);

  const subscribeLiveStateCallback = useCallback(
    (callback: () => void) => {
      if (!tankId) return () => {};
      return subscribeLiveState(tankId, callback);
    },
    [tankId]
  );

  const liveState = useSyncExternalStore<LiveState | null>(
    subscribeLiveStateCallback,
    () => (tankId ? getLiveState(tankId) : null),
    () => null
  );

  const feeds = liveState?.feeds || [];
  const activeFeed = feeds.find(f => f.id === liveState?.selected_feed_id) || feeds[0] || DEFAULT_FEED;
  const isWebcam = activeFeed.stream_url?.startsWith('webcam:');
  const isStreaming = liveState?.is_live ?? false;

  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const preferenceAppliedRef = useRef(false);

  const saveLiveState = useCallback((state: LiveState) => {
    if (tankId) {
      saveLiveStateToRepository(tankId, state);
    }
  }, [tankId]);

  const updateCalibration = useCallback((waterLineY: number) => {
    if (tankId) {
      const current = getLiveState(tankId);
      const activeFeedId = current.selected_feed_id || '';
      updateCalibrationInRepository(tankId, activeFeedId, waterLineY);
    }
  }, [tankId]);

  // Apply preferred camera source to the live-state feed when idle.
  useEffect(() => {
    if (!liveState || isStreaming || preferenceAppliedRef.current) return;
    const preferredUrl = buildStreamUrl(preferences.cameraSource);
    const currentUrl = liveState.feeds[0]?.stream_url;
    if (currentUrl === preferredUrl) {
      preferenceAppliedRef.current = true;
      return;
    }

    const nextFeed: CameraFeedConfig = {
      ...(liveState.feeds[0] || DEFAULT_FEED),
      stream_url: preferredUrl,
      mock_image: preferredUrl.startsWith('mock:') ? '/mock_camera_main.png' : '',
      name: preferences.cameraSource.type === 'mock' ? 'Demo Feed' : (preferences.cameraSource.label || 'Local Webcam'),
    };

    saveLiveState({
      ...liveState,
      stream_url: preferredUrl,
      feeds: [nextFeed],
    });
    preferenceAppliedRef.current = true;
  }, [liveState, isStreaming, preferences.cameraSource, saveLiveState]);

  // Reset the applied flag when the camera source preference changes.
  useEffect(() => {
    preferenceAppliedRef.current = false;
  }, [preferences.cameraSource]);

  // Webcam acquisition
  useEffect(() => {
    if (isStreaming && isWebcam) {
      const deviceId = activeFeed.stream_url.split(':')[1];
      navigator.mediaDevices.getUserMedia({
        video: deviceId && deviceId !== 'default' ? { deviceId: { exact: deviceId } } : true
      })
      .then(stream => {
        streamRef.current = stream;
        setWebcamStream(stream);
      })
      .catch(err => {
        console.error('Failed to access webcam:', err);
      });
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setWebcamStream(null);
    };
  }, [isStreaming, isWebcam, activeFeed.stream_url]);

  // Bind stream to video element
  useEffect(() => {
    if (videoRef.current && webcamStream) {
      videoRef.current.srcObject = webcamStream;
    }
  }, [webcamStream]);

  const startStream = useCallback(() => {
    if (!liveState) return;
    const preferredUrl = buildStreamUrl(preferences.cameraSource);
    const feed = liveState.feeds[0] || { ...DEFAULT_FEED, stream_url: preferredUrl };
    const updatedFeed = {
      ...feed,
      stream_url: preferredUrl,
      is_live: true,
      started_at: feed.started_at || new Date().toISOString()
    };
    saveLiveState({
      ...liveState,
      is_live: true,
      stream_url: preferredUrl,
      started_at: updatedFeed.started_at,
      last_ping_at: new Date().toISOString(),
      current_clarity: updatedFeed.current_clarity,
      current_fish_count: updatedFeed.current_fish_count,
      feeds: [updatedFeed]
    });
  }, [liveState, preferences.cameraSource, saveLiveState]);

  return {
    liveState,
    activeFeed,
    isWebcam,
    isStreaming,
    videoRef,
    webcamStream,
    saveLiveState,
    startStream,
    updateCalibration
  };
};
