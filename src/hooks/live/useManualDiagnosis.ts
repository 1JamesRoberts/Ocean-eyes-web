import { useState, useEffect, useRef, useCallback, type Dispatch, type SetStateAction } from 'react';
import { useAlerts } from '../useAlerts';
import { LocalStorageStore } from '../../services/localStorageStore';
import { isVideoReady, captureFrame, sendFrameForDetection } from '../../services/ai_service';
import { buildDiseaseAlert } from '../../models/services/alertBuilder';
import {
  DETECTION_CONFIDENCE,
  DIAGNOSIS_MIN_CONF,
  BACKEND_OFFLINE_MESSAGE,
} from '../../utils/constants';
import type { AIDetectionResult } from '../../types/aquarium';
import type { BackendStatus } from './useBackendStatus';
import type { UseAIAnalyticsOptions } from './useAIAnalytics';

interface UseManualDiagnosisOptions extends UseAIAnalyticsOptions {
  backendStatus: BackendStatus;
  checkBackend: (signal?: AbortSignal) => Promise<boolean>;
  aiLoading: boolean;
  setLastPrediction: Dispatch<SetStateAction<AIDetectionResult | null>>;
}

interface UseManualDiagnosisResult {
  manualDiagnosisLoading: boolean;
  manualDiagnosisError: string | null;
  lastManualDiagnosis: AIDetectionResult | null;
  manualDiagnose: () => Promise<void>;
}

export const useManualDiagnosis = ({
  cameraFeedRef,
  isStreaming,
  backendStatus,
  checkBackend,
  aiLoading,
  setLastPrediction,
}: UseManualDiagnosisOptions): UseManualDiagnosisResult => {
  const { addAlert } = useAlerts();

  const [manualDiagnosisLoading, setManualDiagnosisLoading] = useState(false);
  const [manualDiagnosisError, setManualDiagnosisError] = useState<string | null>(null);
  const [lastManualDiagnosis, setLastManualDiagnosis] = useState<AIDetectionResult | null>(null);
  const manualDiagnosisAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (manualDiagnosisAbortControllerRef.current) {
        manualDiagnosisAbortControllerRef.current.abort();
        manualDiagnosisAbortControllerRef.current = null;
      }
    };
  }, []);

  const manualDiagnose = useCallback(async () => {
    if (manualDiagnosisLoading || aiLoading || backendStatus === 'checking' || !isStreaming) return;

    if (!(await checkBackend())) {
      setManualDiagnosisError(BACKEND_OFFLINE_MESSAGE);
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

      const diagnosedFish = result.detections.find((d) => d.diagnosis);
      if (diagnosedFish?.diagnosis && !diagnosedFish.diagnosis.healthy) {
        addAlert(buildDiseaseAlert(diagnosedFish));
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setManualDiagnosisError(err instanceof Error ? err.message : 'LLM diagnosis failed');
    } finally {
      setManualDiagnosisLoading(false);
      manualDiagnosisAbortControllerRef.current = null;
    }
  }, [
    manualDiagnosisLoading,
    aiLoading,
    backendStatus,
    isStreaming,
    checkBackend,
    cameraFeedRef,
    setLastPrediction,
    addAlert,
  ]);

  return {
    manualDiagnosisLoading,
    manualDiagnosisError,
    lastManualDiagnosis,
    manualDiagnose,
  };
};
