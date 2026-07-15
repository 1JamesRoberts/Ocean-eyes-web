// src/context/LiveFeedContext.tsx - Shared live feed state and webcam stream
//
// This context exists so every video consumer across the app binds to the same
// MediaStream. Without it, switching tabs unmounts the active <video> element,
// the hook cleans up the camera, and the next tab must re-acquire the stream
// from scratch. Keeping one stream in a top-level provider prevents that reload.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  getLiveState,
  saveLiveState as saveLiveStateToRepository,
  subscribeLiveState,
  updateCalibration as updateCalibrationInRepository,
} from '../models/repositories/storageBase';
import { useLivePreferences } from '../hooks/useLivePreferences';
import {
  buildCameraVideoConstraints,
  oppositeCameraFacingMode,
  type CameraFacingMode,
} from '../models/services/cameraConstraints';
import type {
  CameraFeedConfig,
  CameraSourcePreference,
  LiveState,
} from '../types/aquarium';

const DEFAULT_FEED: CameraFeedConfig = {
  id: 'feed-main',
  name: 'Local Webcam',
  stream_url: 'webcam:default',
  is_live: false,
  started_at: null,
  current_clarity: 1.2,
  current_fish_count: 0,
  mock_image: '',
};

const buildStreamUrl = (source: CameraSourcePreference): string => {
  if (source.type === 'mock') return 'mock:/mock_camera_main.png';
  if (source.deviceId && source.deviceId !== 'default')
    return `webcam:${source.deviceId}`;
  return 'webcam:default';
};

export interface LiveFeedContextValue {
  liveState: LiveState | null;
  activeFeed: CameraFeedConfig;
  isWebcam: boolean;
  isStreaming: boolean;
  webcamStream: MediaStream | null;
  cameraFacingMode: CameraFacingMode;
  isCameraSwitching: boolean;
  canSwitchCamera: boolean;
  saveLiveState: (state: LiveState) => void;
  startStream: () => void;
  switchCamera: () => void;
  updateCalibration: (waterLineY: number) => void;
}

const LiveFeedContext = createContext<LiveFeedContextValue | undefined>(
  undefined
);

// eslint-disable-next-line react-refresh/only-export-components
export const useLiveFeedContext = (): LiveFeedContextValue => {
  const context = useContext(LiveFeedContext);
  if (context === undefined) {
    throw new Error(
      'useLiveFeedContext must be used within a LiveFeedProvider'
    );
  }
  return context;
};

interface LiveFeedProviderProps {
  tankId: string | null;
  children: React.ReactNode;
}

export const LiveFeedProvider: React.FC<LiveFeedProviderProps> = ({
  tankId,
  children,
}) => {
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
  const activeFeed =
    feeds.find((f) => f.id === liveState?.selected_feed_id) ||
    feeds[0] ||
    DEFAULT_FEED;
  const isWebcam = activeFeed.stream_url?.startsWith('webcam:');
  const isStreaming = liveState?.is_live ?? false;

  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [cameraFacingMode, setCameraFacingMode] =
    useState<CameraFacingMode>('environment');
  const [isCameraSwitching, setIsCameraSwitching] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const preferenceAppliedRef = useRef(false);
  const configuredDeviceId = activeFeed.stream_url.split(':')[1];
  const canSwitchCamera =
    isWebcam && (!configuredDeviceId || configuredDeviceId === 'default');

  const saveLiveState = useCallback(
    (state: LiveState) => {
      if (tankId) {
        saveLiveStateToRepository(tankId, state);
      }
    },
    [tankId]
  );

  const updateCalibration = useCallback(
    (waterLineY: number) => {
      if (!tankId) return;
      const current = getLiveState(tankId);
      const activeFeedId = current?.selected_feed_id || '';
      updateCalibrationInRepository(tankId, activeFeedId, waterLineY);
    },
    [tankId]
  );

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
      mock_image: preferredUrl.startsWith('mock:')
        ? '/mock_camera_main.png'
        : '',
      name:
        preferences.cameraSource.type === 'mock'
          ? 'Demo Feed'
          : preferences.cameraSource.label || 'Local Webcam',
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

  // Webcam acquisition. Kept in the provider so the stream survives tab changes.
  useEffect(() => {
    if (!isStreaming || !isWebcam) return;

    let disposed = false;

    navigator.mediaDevices
      .getUserMedia({
        video: buildCameraVideoConstraints(
          configuredDeviceId,
          cameraFacingMode
        ),
      })
      .then((stream) => {
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        setWebcamStream(stream);
        setIsCameraSwitching(false);
      })
      .catch((err) => {
        if (disposed) return;
        setIsCameraSwitching(false);
        console.error('Failed to access webcam:', err);
      });

    return () => {
      disposed = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setWebcamStream(null);
    };
  }, [isStreaming, isWebcam, configuredDeviceId, cameraFacingMode]);

  const switchCamera = useCallback(() => {
    if (!canSwitchCamera || isCameraSwitching) return;
    setIsCameraSwitching(true);
    setCameraFacingMode(oppositeCameraFacingMode);
  }, [canSwitchCamera, isCameraSwitching]);

  const startStream = useCallback(() => {
    if (!liveState) return;
    const preferredUrl = buildStreamUrl(preferences.cameraSource);
    const feed = liveState.feeds[0] || {
      ...DEFAULT_FEED,
      stream_url: preferredUrl,
    };
    const updatedFeed = {
      ...feed,
      stream_url: preferredUrl,
      is_live: true,
      started_at: feed.started_at || new Date().toISOString(),
    };

    saveLiveState({
      ...liveState,
      is_live: true,
      stream_url: preferredUrl,
      started_at: updatedFeed.started_at,
      last_ping_at: new Date().toISOString(),
      current_clarity: updatedFeed.current_clarity,
      current_fish_count: updatedFeed.current_fish_count,
      feeds: [updatedFeed],
    });
  }, [liveState, preferences.cameraSource, saveLiveState]);

  return (
    <LiveFeedContext.Provider
      value={{
        liveState,
        activeFeed,
        isWebcam,
        isStreaming,
        webcamStream,
        cameraFacingMode,
        isCameraSwitching,
        canSwitchCamera,
        saveLiveState,
        startStream,
        switchCamera,
        updateCalibration,
      }}
    >
      {children}
    </LiveFeedContext.Provider>
  );
};
