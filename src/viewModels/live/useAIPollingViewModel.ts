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
import { isVideoReady, captureVideoFrame } from '../../models/services/frameCapture';
import { processDetectionFrame } from '../../models/services/aiFrameProcessor';
import { useAlertsViewModel } from '../useAlertsViewModel';
import { useReadingsViewModel } from '../useReadingsViewModel';
import { useFishViewModel } from '../useFishViewModel';
import {
  AI_POLL_INTERVAL_MS,
  BACKEND_OFFLINE_MESSAGE,
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
  useFishViewModel(tankId);

  const [isAIActive, setIsAIActive] = useState(() => liveState?.ai_active ?? false);
  const [lastPrediction, setLastPrediction] = useState<AIDetectionResult | null>(
    () => liveState?.last_prediction ?? null
  );
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiAbortControllerRef = useRef<AbortController | null>(null);
  const aiMountedRef = useRef(false);

  const activeTankRef = useRef(activeTank);
  const liveStateRef = useRef(liveState);
  const activeFeedRef = useRef(activeFeed);
  const tankIdRef = useRef(tankId);

  useEffect(() => {
    activeTankRef.current = activeTank;
    liveStateRef.current = liveState;
    activeFeedRef.current = activeFeed;
    tankIdRef.current = tankId;
  });

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
        const currentTank = activeTankRef.current;
        const currentLiveState = liveStateRef.current;
        const currentFeed = activeFeedRef.current;
        const currentTankId = tankIdRef.current;

        if (!currentTank || !currentLiveState || !currentTankId) {
          return;
        }

        const { result } = await processDetectionFrame(
          blob,
          {
            tankId: currentTankId,
            activeTankId: currentTank.id,
            activeFeed: currentFeed,
            liveState: currentLiveState,
            writeReading,
            addAlert,
          },
          controller.signal
        );

        if (!aiMountedRef.current) return;
        setLastPrediction(result);
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
    // Polling loop lifecycle is driven by the flags below; mutable frame data is read from refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isAIActive,
    isStreaming,
    backendStatus,
    activeFeed.mock_image,
    activeFeed.id,
    isWebcam,
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
