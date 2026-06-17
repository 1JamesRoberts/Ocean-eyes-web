import { useState, useEffect, useRef, useCallback } from 'react';
import { useAlerts } from '../useAlerts';
import { useReadings } from '../useReadings';
import { isBackendAvailable, isVideoReady, captureFrame, sendFrameForDetection, sendFrameForTurbidity } from '../../services/ai_service';
import { LocalStorageStore } from '../../services/localStorageStore';
import type {
  AIDetectionResult,
  AITurbidityResult,
  CameraFeedConfig,
  FishEntry,
  LiveState,
  TankBrief,
} from '../../types/aquarium';
import type { CameraFeedHandle } from '../../components/live/CameraFeed';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BackendStatus = 'unknown' | 'checking' | 'online' | 'offline';

interface UseAIAnalyticsOptions {
  cameraFeedRef: React.RefObject<CameraFeedHandle | null>;
  isStreaming: boolean;
  activeFeed: CameraFeedConfig;
  isWebcam: boolean;
  activeTank: TankBrief | null;
  liveState: LiveState | null;
  saveLiveState: (state: LiveState) => void;
  fishList: FishEntry[];
  updateDetectedCount: (fishId: string, count: number) => void;
}

interface UseAIAnalyticsResult {
  isAIActive: boolean;
  aiLoading: boolean;
  aiError: string | null;
  backendStatus: BackendStatus;
  lastPrediction: AIDetectionResult | null;
  lastTurbidityResult: AITurbidityResult | null;
  turbidityLoading: boolean;
  turbidityError: string | null;
  manualDiagnosisLoading: boolean;
  manualDiagnosisError: string | null;
  lastManualDiagnosis: AIDetectionResult | null;
  toggleAI: () => Promise<void>;
  measureTurbidity: () => Promise<void>;
  manualDiagnose: () => Promise<void>;
  currentClarity: number;
  currentFishCount: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AI_POLL_INTERVAL_MS = 10_000;
const HEALTH_CHECK_INTERVAL_MS = 30_000;
const ONE_HOUR_MS = 3_600_000;
const DETECTION_CONFIDENCE = 0.35;
const DIAGNOSIS_MIN_CONF = 0.6;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useAIAnalytics = ({
  cameraFeedRef,
  isStreaming,
  activeFeed,
  isWebcam,
  activeTank,
  liveState,
  saveLiveState,
  fishList,
  updateDetectedCount,
}: UseAIAnalyticsOptions): UseAIAnalyticsResult => {
  const { addAlert } = useAlerts();
  const { writeReading } = useReadings();

  // ── AI state ──────────────────────────────────────────────────────────

  const [isAIActive, setIsAIActive] = useState(() => liveState?.ai_active ?? false);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('unknown');
  const [lastPrediction, setLastPrediction] = useState<AIDetectionResult | null>(
    () => liveState?.last_prediction ?? null,
  );
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiAbortControllerRef = useRef<AbortController | null>(null);
  const aiMountedRef = useRef(true);

  // ── Turbidity state ───────────────────────────────────────────────────

  const [turbidityLoading, setTurbidityLoading] = useState(false);
  const [turbidityError, setTurbidityError] = useState<string | null>(null);
  const turbidityAbortControllerRef = useRef<AbortController | null>(null);
  const [lastTurbidityResult, setLastTurbidityResult] = useState<AITurbidityResult | null>(
    () => liveState?.last_turbidity_result ?? null,
  );

  // ── Manual diagnosis state ────────────────────────────────────────────

  const [manualDiagnosisLoading, setManualDiagnosisLoading] = useState(false);
  const [manualDiagnosisError, setManualDiagnosisError] = useState<string | null>(null);
  const [lastManualDiagnosis, setLastManualDiagnosis] = useState<AIDetectionResult | null>(null);
  const manualDiagnosisAbortControllerRef = useRef<AbortController | null>(null);

  // ── Derived values ────────────────────────────────────────────────────

  const currentClarity = isStreaming && liveState?.is_live ? activeFeed.current_clarity : 0;
  const currentFishCount = isStreaming && liveState?.is_live ? activeFeed.current_fish_count : 0;

  // ── Persist AI state into per-tank LiveState ──────────────────────────

  useEffect(() => {
    if (!activeTank || !liveState) return;
    saveLiveState({
      ...liveState,
      ai_active: isAIActive,
      last_prediction: lastPrediction,
      last_turbidity_result: lastTurbidityResult,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAIActive, lastPrediction, lastTurbidityResult]);

  // ── Backend health check (every 30s while streaming) ──────────────────

  useEffect(() => {
    if (!isStreaming) return;
    const check = async () => {
      const ok = await isBackendAvailable();
      setBackendStatus(prev => (prev === 'checking' ? prev : ok ? 'online' : 'offline'));
    };
    check();
    const interval = setInterval(check, HEALTH_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isStreaming]);

  // ── Cleanup turbidity abort controller on unmount ─────────────────────

  useEffect(() => {
    return () => {
      if (turbidityAbortControllerRef.current) {
        turbidityAbortControllerRef.current.abort();
        turbidityAbortControllerRef.current = null;
      }
      if (manualDiagnosisAbortControllerRef.current) {
        manualDiagnosisAbortControllerRef.current.abort();
        manualDiagnosisAbortControllerRef.current = null;
      }
    };
  }, []);

  // ── Backend online guard ──────────────────────────────────────────────

  const ensureBackendOnline = useCallback(async (signal?: AbortSignal): Promise<boolean> => {
    if (backendStatus === 'online') return true;
    setBackendStatus('checking');
    const ok = await isBackendAvailable(signal);
    if (ok) {
      setBackendStatus('online');
      return true;
    }
    setBackendStatus('offline');
    return false;
  }, [backendStatus]);

  // ── AI toggle ─────────────────────────────────────────────────────────

  const toggleAI = useCallback(async () => {
    if (aiLoading || backendStatus === 'checking' || !isStreaming) return;

    // Turning OFF — immediate, no backend check
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

    // Turning ON — verify backend first
    if (!(await ensureBackendOnline())) {
      setAiError('AI Backend is offline. Please start it first: cd ai && python api_server.py');
      return;
    }
    setIsAIActive(true);
    setAiError(null);
  }, [isAIActive, aiLoading, backendStatus, isStreaming, ensureBackendOnline]);

  // ── Manual LLM fish diagnosis ────────────────────────────────────────

  const manualDiagnose = useCallback(async () => {
    if (manualDiagnosisLoading || aiLoading || backendStatus === 'checking' || !isStreaming) return;

    if (!(await ensureBackendOnline())) {
      setManualDiagnosisError('AI Backend is offline. Please start it first: cd ai && python api_server.py');
      return;
    }

    if (!cameraFeedRef.current?.videoElement) {
      setManualDiagnosisError('Camera feed is not ready yet');
      return;
    }

    const video = cameraFeedRef.current.videoElement;
    if (!isVideoReady(video)) {
      setManualDiagnosisError('Camera feed is not ready yet');
      return;
    }

    setManualDiagnosisLoading(true);
    setManualDiagnosisError(null);
    const controller = new AbortController();
    manualDiagnosisAbortControllerRef.current = controller;

    try {
      const blob = await captureFrame(video);
      const result = await sendFrameForDetection(
        blob,
        DETECTION_CONFIDENCE,
        true,
        DIAGNOSIS_MIN_CONF,
        controller.signal,
      );

      setLastPrediction(result);
      setLastManualDiagnosis(result);
      LocalStorageStore.safeWriteRaw('oceaneyes_last_diagnosis_time', Date.now().toString());

      const diagnosedFish = result.detections.find(d => d.diagnosis);
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
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setManualDiagnosisError(err instanceof Error ? err.message : 'LLM diagnosis failed');
    } finally {
      setManualDiagnosisLoading(false);
      manualDiagnosisAbortControllerRef.current = null;
    }
  }, [manualDiagnosisLoading, aiLoading, backendStatus, isStreaming, ensureBackendOnline, cameraFeedRef, addAlert]);

  // ── AI detection polling loop ─────────────────────────────────────────

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
        // Video isn't ready yet; retry on the next scheduled tick instead of failing.
        return;
      }

      setAiLoading(true);
      setAiError(null);
      const controller = new AbortController();
      aiAbortControllerRef.current = controller;

      try {
        const blob = await captureFrame(video);

        const lastDiagStr = localStorage.getItem('oceaneyes_last_diagnosis_time');
        const lastDiag = lastDiagStr ? parseInt(lastDiagStr, 10) : 0;
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

          const diagnosedFish = result.detections.find(d => d.diagnosis);
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

          const updatedFeeds = liveState.feeds.map(f => {
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

          fishList.forEach(fish => {
            updateDetectedCount(fish.id, 0);
          });
          Object.entries(result.summary.species_counts).forEach(([speciesId, count]) => {
            const fishEntry = fishList.find(f => f.speciesId === speciesId);
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

  // ── Turbidity measurement ─────────────────────────────────────────────

  const measureTurbidity = useCallback(async () => {
    if (!cameraFeedRef.current?.videoElement || turbidityLoading || backendStatus === 'checking' || !isStreaming) return;

    const video = cameraFeedRef.current.videoElement;
    if (!isVideoReady(video)) {
      setTurbidityError('Camera feed is not ready yet');
      return;
    }

    if (!(await ensureBackendOnline())) {
      setTurbidityError('AI Backend is offline. Please start it first: cd ai && python api_server.py');
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

        const updatedFeeds = liveState.feeds.map(f => {
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
    ensureBackendOnline,
    liveState,
    saveLiveState,
    writeReading,
  ]);

  return {
    isAIActive,
    aiLoading,
    aiError,
    backendStatus,
    lastPrediction,
    lastTurbidityResult,
    turbidityLoading,
    turbidityError,
    manualDiagnosisLoading,
    manualDiagnosisError,
    lastManualDiagnosis,
    toggleAI,
    measureTurbidity,
    manualDiagnose,
    currentClarity,
    currentFishCount,
  };
};
