import { useState, useEffect, useRef, useCallback } from 'react';
import { useLiveState } from './useLiveState';
import type { CameraFeedConfig, LiveState } from '../types/aquarium';

export interface UseCameraFeedResult {
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

export const useCameraFeed = (tankId: string | null): UseCameraFeedResult => {
  const { liveState, saveLiveState, updateCalibration } = useLiveState(tankId);

  const feeds = liveState?.feeds || [];
  const activeFeed = feeds.find(f => f.id === liveState?.selected_feed_id) || feeds[0] || DEFAULT_FEED;
  const isWebcam = activeFeed.stream_url?.startsWith('webcam:');
  const isStreaming = liveState?.is_live ?? false;

  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
    const feed = liveState.feeds[0];
    if (!feed) return;
    const updatedFeed = {
      ...feed,
      is_live: true,
      started_at: feed.started_at || new Date().toISOString()
    };
    saveLiveState({
      ...liveState,
      is_live: true,
      stream_url: updatedFeed.stream_url,
      started_at: updatedFeed.started_at,
      last_ping_at: new Date().toISOString(),
      current_clarity: updatedFeed.current_clarity,
      current_fish_count: updatedFeed.current_fish_count,
      feeds: [updatedFeed]
    });
  }, [liveState, saveLiveState]);

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
