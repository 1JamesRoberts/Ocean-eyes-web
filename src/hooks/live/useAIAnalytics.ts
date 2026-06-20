import { useEffect } from 'react';
import type {
  AIDetectionResult,
  AITurbidityResult,
  CameraFeedConfig,
  LiveState,
  TankBrief,
} from '../../types/aquarium';
import type { CameraFeedHandle } from '../../components/live/CameraFeed';
import { selectActiveFeedMetrics } from '../../models/services/inferenceHelpers';
import { useBackendStatus, type BackendStatus } from './useBackendStatus';
import { useAIPolling } from './useAIPolling';
import { useTurbidityMeasurement } from './useTurbidityMeasurement';
import { useManualDiagnosis } from './useManualDiagnosis';

export interface UseAIAnalyticsViewModelOptions {
  cameraFeedRef: React.RefObject<CameraFeedHandle | null>;
  isStreaming: boolean;
  activeFeed: CameraFeedConfig;
  isWebcam: boolean;
  activeTank: TankBrief | null;
  liveState: LiveState | null;
  saveLiveState: (state: LiveState) => void;
  tankId: string | null;
}

export interface UseAIAnalyticsViewModelResult {
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
  tankId,
}: UseAIAnalyticsViewModelOptions): UseAIAnalyticsViewModelResult => {
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
    backendStatus,
    checkBackend,
    tankId,
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
    activeTank,
    liveState,
    saveLiveState,
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
