import { useEffect, useRef } from 'react';
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
import { useLivePreferences } from '../useLivePreferences';

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
  const { preferences } = useLivePreferences(tankId);
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
    aiPreferences: preferences.ai,
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

  const activeTankRef = useRef(activeTank);
  const liveStateRef = useRef(liveState);
  const saveLiveStateRef = useRef(saveLiveState);
  const lastPredictionRef = useRef(lastPrediction);
  const lastTurbidityResultRef = useRef(lastTurbidityResult);

  useEffect(() => { activeTankRef.current = activeTank; }, [activeTank]);
  useEffect(() => { liveStateRef.current = liveState; }, [liveState]);
  useEffect(() => { saveLiveStateRef.current = saveLiveState; }, [saveLiveState]);
  useEffect(() => { lastPredictionRef.current = lastPrediction; }, [lastPrediction]);
  useEffect(() => { lastTurbidityResultRef.current = lastTurbidityResult; }, [lastTurbidityResult]);

  // Persist AI toggle state immediately
  useEffect(() => {
    if (!activeTankRef.current || !liveStateRef.current) return;
    saveLiveStateRef.current({
      ...liveStateRef.current,
      ai_active: isAIActive,
    });
  }, [isAIActive]);

  // Auto-start AI when stream connects if preference is enabled.
  const autoStartTriggeredRef = useRef(false);
  useEffect(() => {
    if (!isStreaming || !preferences.ai.autoStart || isAIActive || aiLoading || backendStatus !== 'online') return;
    if (autoStartTriggeredRef.current) return;
    autoStartTriggeredRef.current = true;
    toggleAI();
  }, [isStreaming, preferences.ai.autoStart, isAIActive, aiLoading, backendStatus, toggleAI]);

  useEffect(() => {
    if (!isStreaming) {
      autoStartTriggeredRef.current = false;
    }
  }, [isStreaming, isAIActive]);

  // Persist full prediction/turbidity results when stream stops
  useEffect(() => {
    if (isStreaming) return;
    if (!activeTankRef.current || !liveStateRef.current) return;
    saveLiveStateRef.current({
      ...liveStateRef.current,
      ai_active: isAIActive,
      last_prediction: lastPredictionRef.current,
      last_turbidity_result: lastTurbidityResultRef.current,
    });
  }, [isStreaming, isAIActive]);

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
