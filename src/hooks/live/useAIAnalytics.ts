import { useEffect } from 'react';
import { useBackendStatus } from './useBackendStatus';
import { useAIPolling } from './useAIPolling';
import { useTurbidityMeasurement } from './useTurbidityMeasurement';
import { useManualDiagnosis } from './useManualDiagnosis';
import { selectActiveFeedMetrics } from '../../models/services/feedMetricsService';
import type {
  AIDetectionResult,
  AITurbidityResult,
  CameraFeedConfig,
  FishEntry,
  LiveState,
  TankBrief,
} from '../../types/aquarium';
import type { CameraFeedHandle } from '../../components/live/CameraFeed';
import type { BackendStatus } from './useBackendStatus';

export interface UseAIAnalyticsOptions {
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
  const { backendStatus, checkBackend } = useBackendStatus(isStreaming);
  const {
    isAIActive,
    aiLoading,
    aiError,
    lastPrediction,
    setLastPrediction,
    toggleAI,
  } = useAIPolling({
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
  });

  const {
    lastTurbidityResult,
    turbidityLoading,
    turbidityError,
    measureTurbidity,
  } = useTurbidityMeasurement({
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
  });

  const {
    manualDiagnosisLoading,
    manualDiagnosisError,
    lastManualDiagnosis,
    manualDiagnose,
  } = useManualDiagnosis({
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
    aiLoading,
    setLastPrediction,
  });

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

  const { clarity: currentClarity, fishCount: currentFishCount } = selectActiveFeedMetrics(
    isStreaming ? liveState : null,
    activeFeed,
    undefined
  );

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
