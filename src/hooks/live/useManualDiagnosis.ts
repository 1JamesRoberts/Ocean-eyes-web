import { useState, useEffect, useRef, useCallback, type Dispatch, type SetStateAction } from 'react';
import type { AIDetectionResult } from '../../types/aquarium';
import type { CameraFeedHandle } from '../../components/live/CameraFeed';
import { sendFrameForDetection } from '../../models/api/aiApi';
import { isVideoReady, captureVideoFrame, recordDiagnosisTime } from '../../models/services/inferenceHelpers';
import { buildDiseaseAlert } from '../../models/services/alertBuilder';
import { useAlerts } from '../useAlerts';
import {
  DETECTION_CONFIDENCE,
  DIAGNOSIS_MIN_CONF,
  BACKEND_OFFLINE_MESSAGE,
} from '../../utils/constants';
import type { BackendStatus } from './useBackendStatus';

export interface UseManualDiagnosisViewModelOptions {
  cameraFeedRef: React.RefObject<CameraFeedHandle | null>;
  isStreaming: boolean;
  backendStatus: BackendStatus;
  checkBackend: (signal?: AbortSignal) => Promise<boolean>;
  aiLoading: boolean;
  setLastPrediction: Dispatch<SetStateAction<AIDetectionResult | null>>;
}

export interface UseManualDiagnosisViewModelResult {
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
}: UseManualDiagnosisViewModelOptions): UseManualDiagnosisViewModelResult => {
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
      const blob = await captureVideoFrame(video);
      const result = await sendFrameForDetection(
        blob,
        DETECTION_CONFIDENCE,
        true,
        DIAGNOSIS_MIN_CONF,
        controller.signal
      );

      setLastPrediction(result);
      setLastManualDiagnosis(result);
      recordDiagnosisTime();

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
