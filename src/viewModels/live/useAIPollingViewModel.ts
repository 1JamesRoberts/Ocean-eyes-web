import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { CameraFeedConfig, LiveState, TankBrief, AIDetectionResult } from '../../types/aquarium';
import type { CameraFeedHandle } from '../../components/live/CameraFeed';
import { sendFrameForDetection } from '../../models/api/aiApi';
import { isVideoReady, captureVideoFrame } from '../../models/services/frameCapture';
import { buildDiseaseAlert } from '../../models/services/alertBuilder';
import { recordFeedReading } from '../../models/services/readingRecorder';
import {
  getSnapshot,
  safeSetItem,
  notifyUpdate,
} from '../../models/repositories/storageBase';
import { useAlertsViewModel } from '../useAlertsViewModel';
import { useReadingsViewModel } from '../useReadingsViewModel';
import { useFishViewModel } from '../useFishViewModel';
import {
  AI_POLL_INTERVAL_MS,
  DIAGNOSIS_COOLDOWN_MS,
  DETECTION_CONFIDENCE,
  DIAGNOSIS_MIN_CONF,
  BACKEND_OFFLINE_MESSAGE,
  LAST_DIAGNOSIS_TIME_KEY,
} from '../../utils/constants';
import type { BackendStatus } from './useBackendStatusViewModel';

export interface UseAIPollingViewModelOptions {
  cameraFeedRef: React.RefObject<CameraFeedHandle | null>;
  isStreaming: boolean;
  activeFeed: CameraFeedConfig;
  isWebcam: boolean;
  activeTank: TankBrief | null;
  liveState: LiveState | null;
  saveLiveState?: (state: LiveState) => void;
  backendStatus: BackendStatus;
  checkBackend: (signal?: AbortSignal) => Promise<boolean>;
  tankId: string | null;
}

export interface UseAIPollingViewModelResult {
  isAIActive: boolean;
  aiLoading: boolean;
  aiError: string | null;
  lastPrediction: AIDetectionResult | null;
  setLastPrediction: Dispatch<SetStateAction<AIDetectionResult | null>>;
  toggleAI: () => Promise<void>;
}

export const useAIPollingViewModel = ({
  cameraFeedRef,
  isStreaming,
  activeFeed,
  isWebcam,
  activeTank,
  liveState,
  saveLiveState: _saveLiveState,
  backendStatus,
  checkBackend,
  tankId,
}: UseAIPollingViewModelOptions): UseAIPollingViewModelResult => {
  const { addAlert } = useAlertsViewModel();
  const { writeReading } = useReadingsViewModel();
  const { fishList, updateDetectedCount } = useFishViewModel(tankId);

  const [isAIActive, setIsAIActive] = useState(() => liveState?.ai_active ?? false);
  const [lastPrediction, setLastPrediction] = useState<AIDetectionResult | null>(
    () => liveState?.last_prediction ?? null
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
      setAiError(BACKEND_OFFLINE_MESSAGE);
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
        const blob = await captureVideoFrame(video);

        const lastDiag = getSnapshot<number>(LAST_DIAGNOSIS_TIME_KEY, 0);
        const shouldDiagnose = Date.now() - lastDiag > DIAGNOSIS_COOLDOWN_MS;

        const result = await sendFrameForDetection(
          blob,
          DETECTION_CONFIDENCE,
          shouldDiagnose,
          DIAGNOSIS_MIN_CONF,
          controller.signal
        );

        if (!aiMountedRef.current) return;
        setLastPrediction(result);

        if (shouldDiagnose) {
          const lastDiagResult = safeSetItem(LAST_DIAGNOSIS_TIME_KEY, Date.now().toString());
          if (lastDiagResult.success) notifyUpdate(LAST_DIAGNOSIS_TIME_KEY);

          const diagnosedFish = result.detections.find((d) => d.diagnosis);
          if (diagnosedFish?.diagnosis && !diagnosedFish.diagnosis.healthy) {
            addAlert(buildDiseaseAlert(diagnosedFish));
          }
        }

        if (activeTank && liveState) {
          const totalFish = result.summary.total_detections;

          recordFeedReading({
            tankId: activeTank.id,
            liveState,
            activeFeed,
            clarity: activeFeed.current_clarity ?? 0,
            fishCount: totalFish,
            writeReading,
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
