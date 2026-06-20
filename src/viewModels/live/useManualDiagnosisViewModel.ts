import { useState, useEffect, useRef, useCallback, type Dispatch, type SetStateAction } from 'react';
import type { AIDetectionResult } from '../../types/aquarium';
import type { CameraFeedHandle } from '../../components/live/CameraFeed';
import { isVideoReady, captureVideoFrame } from '../../models/services/frameCapture';
import { processDetectionFrame } from '../../models/services/aiFrameProcessor';
import { useAlertsViewModel } from '../useAlertsViewModel';
import { useReadingsViewModel } from '../useReadingsViewModel';
import {
  BACKEND_OFFLINE_MESSAGE,
} from '../../utils/constants';
import type { BackendStatus } from './useBackendStatusViewModel';

export interface UseManualDiagnosisViewModelOptions {
  cameraFeedRef: React.RefObject<CameraFeedHandle | null>;
  isStreaming: boolean;
  activeFeed?: import('../../types/aquarium').CameraFeedConfig;
  activeTank?: import('../../types/aquarium').TankBrief | null;
  liveState?: import('../../types/aquarium').LiveState | null;
  tankId?: string | null;
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

export const useManualDiagnosisViewModel = ({
  cameraFeedRef,
  isStreaming,
  activeFeed,
  activeTank,
  liveState,
  tankId,
  backendStatus,
  checkBackend,
  aiLoading,
  setLastPrediction,
}: UseManualDiagnosisViewModelOptions): UseManualDiagnosisViewModelResult => {
  const { addAlert } = useAlertsViewModel();
  const { writeReading } = useReadingsViewModel();

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

    if (!activeTank || !liveState || !tankId || !activeFeed) {
      setManualDiagnosisError('Camera feed is not ready yet');
      return;
    }

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
      const { result } = await processDetectionFrame(
        blob,
        {
          tankId,
          activeTankId: activeTank.id,
          activeFeed,
          liveState,
          writeReading,
          addAlert,
        },
        controller.signal
      );

      setLastPrediction(result);
      setLastManualDiagnosis(result);
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
    writeReading,
    activeTank,
    liveState,
    activeFeed,
    tankId,
  ]);

  return {
    manualDiagnosisLoading,
    manualDiagnosisError,
    lastManualDiagnosis,
    manualDiagnose,
  };
};
