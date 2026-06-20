import { useState, useEffect, useRef, useCallback } from 'react';
import type { CameraFeedConfig, LiveState, TankBrief, AITurbidityResult } from '../../types/aquarium';
import type { CameraFeedHandle } from '../../components/live/CameraFeed';
import { sendFrameForTurbidity } from '../../models/api/aiApi';
import { isVideoReady, captureVideoFrame } from '../../models/services/frameCapture';
import { recordFeedReading } from '../../models/services/readingRecorder';
import { useReadingsViewModel } from '../useReadingsViewModel';
import { BACKEND_OFFLINE_MESSAGE } from '../../utils/constants';
import type { BackendStatus } from './useBackendStatusViewModel';

export interface UseTurbidityMeasurementViewModelOptions {
  cameraFeedRef: React.RefObject<CameraFeedHandle | null>;
  isStreaming: boolean;
  activeFeed: CameraFeedConfig;
  activeTank: TankBrief | null;
  liveState: LiveState | null;
  saveLiveState?: (state: LiveState) => void;
  backendStatus: BackendStatus;
  checkBackend: (signal?: AbortSignal) => Promise<boolean>;
}

export interface UseTurbidityMeasurementViewModelResult {
  lastTurbidityResult: AITurbidityResult | null;
  turbidityLoading: boolean;
  turbidityError: string | null;
  measureTurbidity: () => Promise<void>;
}

export const useTurbidityMeasurementViewModel = ({
  cameraFeedRef,
  isStreaming,
  activeFeed,
  activeTank,
  liveState,
  saveLiveState: _saveLiveState,
  backendStatus,
  checkBackend,
}: UseTurbidityMeasurementViewModelOptions): UseTurbidityMeasurementViewModelResult => {
  const { writeReading } = useReadingsViewModel();

  const [turbidityLoading, setTurbidityLoading] = useState(false);
  const [turbidityError, setTurbidityError] = useState<string | null>(null);
  const turbidityAbortControllerRef = useRef<AbortController | null>(null);
  const [lastTurbidityResult, setLastTurbidityResult] = useState<AITurbidityResult | null>(
    () => liveState?.last_turbidity_result ?? null
  );

  useEffect(() => {
    return () => {
      if (turbidityAbortControllerRef.current) {
        turbidityAbortControllerRef.current.abort();
        turbidityAbortControllerRef.current = null;
      }
    };
  }, []);

  const measureTurbidity = useCallback(async () => {
    if (
      !cameraFeedRef.current?.videoElement ||
      turbidityLoading ||
      backendStatus === 'checking' ||
      !isStreaming
    ) {
      return;
    }

    const currentFeed = activeFeed;

    const video = cameraFeedRef.current.videoElement;
    if (!isVideoReady(video)) {
      setTurbidityError('Camera feed is not ready yet');
      return;
    }

    if (!(await checkBackend())) {
      setTurbidityError(BACKEND_OFFLINE_MESSAGE);
      return;
    }

    setTurbidityLoading(true);
    setTurbidityError(null);
    const controller = new AbortController();
    turbidityAbortControllerRef.current = controller;

    try {
      const blob = await captureVideoFrame(video);
      const result = await sendFrameForTurbidity(blob, controller.signal);
      setLastTurbidityResult(result);

      if (activeTank && liveState) {
        const fnuValue = result.turbidity.fnu;
        const clarity = parseFloat(fnuValue.toFixed(2));

        recordFeedReading({
          tankId: activeTank.id,
          liveState,
          activeFeed: currentFeed,
          clarity,
          fishCount: currentFeed.current_fish_count ?? 0,
          writeReading,
        });
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setTurbidityError(err instanceof Error ? err.message : 'Turbidity measurement failed');
    } finally {
      setTurbidityLoading(false);
      turbidityAbortControllerRef.current = null;
    }
  }, [
    cameraFeedRef,
    activeFeed,
    activeTank,
    turbidityLoading,
    isStreaming,
    backendStatus,
    checkBackend,
    liveState,
    writeReading,
  ]);

  return {
    lastTurbidityResult,
    turbidityLoading,
    turbidityError,
    measureTurbidity,
  };
};
