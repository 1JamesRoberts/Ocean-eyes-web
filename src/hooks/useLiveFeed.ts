import { useEffect, useRef } from 'react';
import { useLiveFeedContext } from '../context/LiveFeedContext';
import type { CameraFeedConfig, LiveState } from '../types/aquarium';

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

/**
 * Public hook for components that need a live feed and a video element.
 *
 * All shared state is owned by `LiveFeedProvider` so the `MediaStream` survives
 * tab switches. This hook only adds the local `videoRef` and binds the
 * provider's `webcamStream` to it.
 *
 * **Multiple consumers supported**: several components (e.g. a hero video and a
 * heatmap overlay) can call this hook simultaneously within the same
 * `LiveFeedProvider`. Each gets its own `videoRef`; they all share the same
 * underlying `MediaStream` without conflict.
 */
export const useLiveFeed = (): UseLiveFeedViewModelResult => {
  const {
    liveState,
    activeFeed,
    isWebcam,
    isStreaming,
    webcamStream,
    saveLiveState,
    startStream,
    updateCalibration,
  } = useLiveFeedContext();

  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && webcamStream) {
      videoRef.current.srcObject = webcamStream;
    }
  }, [webcamStream]);

  return {
    liveState,
    activeFeed,
    isWebcam,
    isStreaming,
    videoRef,
    webcamStream,
    saveLiveState,
    startStream,
    updateCalibration,
  };
};
