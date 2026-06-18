import { useState, useEffect, useRef, useCallback } from 'react';
import { useReadings } from '../useReadings';
import { isVideoReady, captureFrame, sendFrameForTurbidity } from '../../services/ai_service';
import type { AITurbidityResult } from '../../types/aquarium';
import type { BackendStatus } from './useBackendStatus';
import type { UseAIAnalyticsOptions } from './useAIAnalytics';

interface UseTurbidityMeasurementOptions extends UseAIAnalyticsOptions {
  backendStatus: BackendStatus;
  checkBackend: (signal?: AbortSignal) => Promise<boolean>;
}

interface UseTurbidityMeasurementResult {
  lastTurbidityResult: AITurbidityResult | null;
  turbidityLoading: boolean;
  turbidityError: string | null;
  measureTurbidity: () => Promise<void>;
}

export const useTurbidityMeasurement = ({
  cameraFeedRef,
  isStreaming,
  activeFeed,
  activeTank,
  liveState,
  saveLiveState,
  backendStatus,
  checkBackend,
}: UseTurbidityMeasurementOptions): UseTurbidityMeasurementResult => {
  const { writeReading } = useReadings();

  const [turbidityLoading, setTurbidityLoading] = useState(false);
  const [turbidityError, setTurbidityError] = useState<string | null>(null);
  const turbidityAbortControllerRef = useRef<AbortController | null>(null);
  const [lastTurbidityResult, setLastTurbidityResult] = useState<AITurbidityResult | null>(
    () => liveState?.last_turbidity_result ?? null,
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

    const video = cameraFeedRef.current.videoElement;
    if (!isVideoReady(video)) {
      setTurbidityError('Camera feed is not ready yet');
      return;
    }

    if (!(await checkBackend())) {
      setTurbidityError(
        'AI Backend is offline. Please start it first: cd ai && python api_server.py',
      );
      return;
    }

    setTurbidityLoading(true);
    setTurbidityError(null);
    const controller = new AbortController();
    turbidityAbortControllerRef.current = controller;

    try {
      const blob = await captureFrame(video);
      const result = await sendFrameForTurbidity(blob, controller.signal);
      setLastTurbidityResult(result);

      if (activeTank && liveState) {
        const fnuValue = result.turbidity.fnu;

        writeReading({
          tankId: activeTank.id,
          clarity: parseFloat(fnuValue.toFixed(2)),
          fishCount: activeFeed.current_fish_count ?? 0,
        });

        const updatedFeeds = liveState.feeds.map((f) => {
          if (f.id === activeFeed.id) {
            return { ...f, current_clarity: parseFloat(fnuValue.toFixed(2)) };
          }
          return f;
        });
        saveLiveState({
          ...liveState,
          current_clarity: parseFloat(fnuValue.toFixed(2)),
          feeds: updatedFeeds,
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
    activeFeed.id,
    activeFeed.current_fish_count,
    activeTank,
    turbidityLoading,
    isStreaming,
    backendStatus,
    checkBackend,
    liveState,
    saveLiveState,
    writeReading,
  ]);

  return {
    lastTurbidityResult,
    turbidityLoading,
    turbidityError,
    measureTurbidity,
  };
};
