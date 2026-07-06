import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { CameraFeedConfig, LiveState, TankBrief, AIDetectionResult, AIPreferences } from '../../types/aquarium';
import type { CameraFeedHandle } from '../../components/live/CameraFeed';
import { sendFrameForDetection } from '../../models/api/aiApi';
import {
  isVideoReady,
  captureVideoFrame,
  shouldDiagnose,
  recordDiagnosisTime,
} from '../../models/services/inferenceHelpers';
import { buildDiseaseAlert } from '../../models/services/alertBuilder';
import { recordFeedReading } from '../../models/services/readingRecorder';
import { useAlerts } from '../useAlerts';
import { useReadings } from '../useReadings';
import { useFish } from '../useFish';
import {
  AI_POLL_INTERVAL_MS,
  DETECTION_CONFIDENCE,
  DIAGNOSIS_MIN_CONF,
  BACKEND_OFFLINE_MESSAGE,
} from '../../utils/constants';
import type { BackendStatus } from './useBackendStatus';

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
  aiPreferences?: AIPreferences;
}

export interface UseAIPollingViewModelResult {
  isAIActive: boolean;
  aiLoading: boolean;
  aiError: string | null;
  lastPrediction: AIDetectionResult | null;
  setLastPrediction: Dispatch<SetStateAction<AIDetectionResult | null>>;
  toggleAI: () => Promise<void>;
}

export const useAIPolling = ({
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
  aiPreferences,
}: UseAIPollingViewModelOptions): UseAIPollingViewModelResult => {
  const { addAlert } = useAlerts();
  const { writeReading } = useReadings();
  const { fishList, saveFish } = useFish(tankId);

  const [isAIActive, setIsAIActive] = useState(() => liveState?.ai_active ?? false);
  const [lastPrediction, setLastPrediction] = useState<AIDetectionResult | null>(
    () => liveState?.last_prediction ?? null
  );
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiAbortControllerRef = useRef<AbortController | null>(null);
  const aiMountedRef = useRef(false);
  const fishListRef = useRef(fishList);
  const addAlertRef = useRef(addAlert);
  const writeReadingRef = useRef(writeReading);
  const saveFishRef = useRef(saveFish);
  const activeTankRef = useRef(activeTank);
  const liveStateRef = useRef(liveState);
  const activeFeedRef = useRef(activeFeed);
  const aiLoadingRef = useRef(aiLoading);
  const aiPreferencesRef = useRef(aiPreferences);

  const preferences = useMemo(
    () =>
      aiPreferences ?? {
        pollingIntervalMs: AI_POLL_INTERVAL_MS,
        detectionConfidenceThreshold: DETECTION_CONFIDENCE,
        speciesConfidenceThreshold: DETECTION_CONFIDENCE,
        diagnosisMinConfidence: DIAGNOSIS_MIN_CONF,
        autoStart: false,
      },
    [aiPreferences]
  );

  useEffect(() => { aiPreferencesRef.current = aiPreferences; }, [aiPreferences]);
  useEffect(() => { activeTankRef.current = activeTank; }, [activeTank]);
  useEffect(() => { liveStateRef.current = liveState; }, [liveState]);
  useEffect(() => { activeFeedRef.current = activeFeed; }, [activeFeed]);
  useEffect(() => { aiLoadingRef.current = aiLoading; }, [aiLoading]);

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

  useEffect(() => { fishListRef.current = fishList; }, [fishList]);
  useEffect(() => { addAlertRef.current = addAlert; }, [addAlert]);
  useEffect(() => { writeReadingRef.current = writeReading; }, [writeReading]);
  useEffect(() => { saveFishRef.current = saveFish; }, [saveFish]);

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
      try {
        if (!aiMountedRef.current) return;
        if (!cameraFeedRef.current?.videoElement || aiLoadingRef.current) return;

        const video = cameraFeedRef.current.videoElement;
        if (!isVideoReady(video)) {
          return;
        }

        setAiLoading(true);
        setAiError(null);
        const controller = new AbortController();
        aiAbortControllerRef.current = controller;
        const blob = await captureVideoFrame(video);

        const diagnose = shouldDiagnose();

        const result = await sendFrameForDetection(
          blob,
          preferences.detectionConfidenceThreshold,
          diagnose,
          preferences.diagnosisMinConfidence,
          controller.signal
        );

        if (!aiMountedRef.current) return;
        setLastPrediction(result);

        if (diagnose) {
          recordDiagnosisTime();

          const diagnosedFish = result.detections.find((d) => d.diagnosis);
          if (diagnosedFish?.diagnosis && !diagnosedFish.diagnosis.healthy) {
            addAlertRef.current(buildDiseaseAlert(diagnosedFish));
          }
        }

        if (activeTankRef.current && liveStateRef.current) {
          const totalFish = result.summary.total_detections;

          recordFeedReading({
            tankId: activeTankRef.current.id,
            liveState: liveStateRef.current,
            activeFeed: activeFeedRef.current,
            clarity: activeFeedRef.current.current_clarity ?? 0,
            fishCount: totalFish,
            writeReading: writeReadingRef.current,
          });

          const countsBySpecies = Object.entries(result.summary.species_counts);
          const countMap = new Map(countsBySpecies);
          const nextFish = fishListRef.current.map((f) => ({
            ...f,
            detected: countMap.get(f.speciesId) ?? 0,
          }));
          saveFishRef.current(nextFish);
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
          aiTimeoutRef.current = setTimeout(processFrame, preferences.pollingIntervalMs);
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
  }, [
    isAIActive,
    isStreaming,
    backendStatus,
    activeFeed.mock_image,
    activeFeed.id,
    isWebcam,
    cameraFeedRef,
    preferences,
  ]);

  return {
    isAIActive,
    aiLoading,
    aiError,
    lastPrediction,
    setLastPrediction,
    toggleAI,
  };
};
