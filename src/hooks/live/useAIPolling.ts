import { useState, useEffect, useRef, useCallback, type Dispatch, type SetStateAction } from 'react';
import { useAlerts } from '../useAlerts';
import { useReadings } from '../useReadings';
import { LocalStorageStore, getSnapshot } from '../../services/localStorageStore';
import { isVideoReady, captureFrame, sendFrameForDetection } from '../../services/ai_service';
import type { AIDetectionResult } from '../../types/aquarium';
import type { BackendStatus } from './useBackendStatus';
import type { UseAIAnalyticsOptions } from './useAIAnalytics';

interface UseAIPollingOptions extends UseAIAnalyticsOptions {
  backendStatus: BackendStatus;
  checkBackend: (signal?: AbortSignal) => Promise<boolean>;
}

interface UseAIPollingResult {
  isAIActive: boolean;
  aiLoading: boolean;
  aiError: string | null;
  lastPrediction: AIDetectionResult | null;
  setLastPrediction: Dispatch<SetStateAction<AIDetectionResult | null>>;
  toggleAI: () => Promise<void>;
}

const AI_POLL_INTERVAL_MS = 10_000;
const ONE_HOUR_MS = 3_600_000;
const DETECTION_CONFIDENCE = 0.35;
const DIAGNOSIS_MIN_CONF = 0.6;

export const useAIPolling = ({
  cameraFeedRef,
  isStreaming,
  activeFeed,
  isWebcam,
  activeTank,
  liveState,
  saveLiveState,
  fishList,
  updateDetectedCount,
  backendStatus,
  checkBackend,
}: UseAIPollingOptions): UseAIPollingResult => {
  const { addAlert } = useAlerts();
  const { writeReading } = useReadings();

  const [isAIActive, setIsAIActive] = useState(() => liveState?.ai_active ?? false);
  const [lastPrediction, setLastPrediction] = useState<AIDetectionResult | null>(
    () => liveState?.last_prediction ?? null,
  );
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiAbortControllerRef = useRef<AbortController | null>(null);
  const aiMountedRef = useRef(false);

  const toggleAI = useCallback(async () => {
    if (aiLoading || backendStatus === 'checking' || !isStreaming) return;

    if (isAIActive) {
      setIsAIActive(false);
      setAiError(null);
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
        aiTimeoutRef.current = null;
      }
      if (aiAbortControllerRef.current) {
        aiAbortControllerRef.current.abort();
        aiAbortControllerRef.current = null;
      }
      return;
    }

    if (!(await checkBackend())) {
      setAiError('AI Backend is offline. Please start it first: cd ai && python api_server.py');
      return;
    }
    setIsAIActive(true);
    setAiError(null);
  }, [aiLoading, backendStatus, isStreaming, isAIActive, checkBackend]);

  useEffect(() => {
    if (!isAIActive || !isStreaming || backendStatus !== 'online') {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
        aiTimeoutRef.current = null;
      }
      if (aiAbortControllerRef.current) {
        aiAbortControllerRef.current.abort();
        aiAbortControllerRef.current = null;
      }
      return;
    }

    aiMountedRef.current = true;

    const processFrame = async () => {
      if (!aiMountedRef.current) return;
      if (!cameraFeedRef.current?.videoElement || aiLoading) return;

      const video = cameraFeedRef.current.videoElement;
      if (!isVideoReady(video)) {
        return;
      }

      setAiLoading(true);
      setAiError(null);
      const controller = new AbortController();
      aiAbortControllerRef.current = controller;

      try {
        const blob = await captureFrame(video);

        const lastDiag = getSnapshot<number>('oceaneyes_last_diagnosis_time', 0);
        const shouldDiagnose = Date.now() - lastDiag > ONE_HOUR_MS;

        const result = await sendFrameForDetection(
          blob,
          DETECTION_CONFIDENCE,
          shouldDiagnose,
          DIAGNOSIS_MIN_CONF,
          controller.signal,
        );

        if (!aiMountedRef.current) return;
        setLastPrediction(result);

        if (shouldDiagnose) {
          LocalStorageStore.safeWriteRaw('oceaneyes_last_diagnosis_time', Date.now().toString());

          const diagnosedFish = result.detections.find((d) => d.diagnosis);
          if (diagnosedFish?.diagnosis && !diagnosedFish.diagnosis.healthy) {
            const diag = diagnosedFish.diagnosis;
            addAlert({
              id: `alert-disease-${Date.now()}`,
              title: `Disease Alert: ${diag.disease}`,
              message: `AI detected signs of ${diag.disease} on a ${diagnosedFish.species_display}: ${diag.description}`,
              tip: `Recommended Action: ${diag.treatment}`,
              severity: 'critical' as const,
              timeAgo: 'Just now',
              clarityBefore: '',
              clarityAfter: '',
              fishBefore: '',
              fishAfter: '',
              resolved: false,
              timestamp: new Date().toISOString(),
            });
          }
        }

        if (activeTank && liveState) {
          const totalFish = result.summary.total_detections;

          writeReading({
            tankId: activeTank.id,
            clarity: activeFeed.current_clarity ?? 0,
            fishCount: totalFish,
          });

          const updatedFeeds = liveState.feeds.map((f) => {
            if (f.id === activeFeed.id) {
              return { ...f, current_fish_count: totalFish };
            }
            return f;
          });
          saveLiveState({
            ...liveState,
            current_fish_count: totalFish,
            feeds: updatedFeeds,
          });

          fishList.forEach((fish) => {
            updateDetectedCount(fish.id, 0);
          });
          Object.entries(result.summary.species_counts).forEach(([speciesId, count]) => {
            const fishEntry = fishList.find((f) => f.speciesId === speciesId);
            if (fishEntry) {
              updateDetectedCount(fishEntry.id, count);
            }
          });
        }
      } catch (err) {
        if (!aiMountedRef.current) return;
        if (err instanceof Error && err.name === 'AbortError') return;
        setAiError(err instanceof Error ? err.message : 'AI inference failed');
      } finally {
        if (aiMountedRef.current) {
          setAiLoading(false);
        }
        aiAbortControllerRef.current = null;
        if (aiMountedRef.current) {
          aiTimeoutRef.current = setTimeout(processFrame, AI_POLL_INTERVAL_MS);
        }
      }
    };

    processFrame();

    return () => {
      aiMountedRef.current = false;
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
        aiTimeoutRef.current = null;
      }
      if (aiAbortControllerRef.current) {
        aiAbortControllerRef.current.abort();
        aiAbortControllerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAIActive, isStreaming, backendStatus, activeFeed.mock_image, activeFeed.id, isWebcam]);

  return {
    isAIActive,
    aiLoading,
    aiError,
    lastPrediction,
    setLastPrediction,
    toggleAI,
  };
};
