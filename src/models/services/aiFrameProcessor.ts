// aiFrameProcessor.ts - Shared AI frame detection processing (pure domain logic)
import { sendFrameForDetection } from '../api/aiApi';
import { buildDiseaseAlert } from './alertBuilder';
import { recordFeedReading } from './readingRecorder';
import {
  shouldRunDiagnosis,
  recordDiagnosisTime,
} from './diagnosisCooldownService';
import { updateDetectedFromSpeciesCounts } from '../repositories/fishRepository';
import { DETECTION_CONFIDENCE, DIAGNOSIS_MIN_CONF } from '../../utils/constants';
import type {
  AIDetectionResult,
  CameraFeedConfig,
  LiveState,
} from '../../types/aquarium';

export interface DetectionProcessorDeps {
  tankId: string;
  activeTankId: string;
  activeFeed: CameraFeedConfig;
  liveState: LiveState;
  writeReading: (data: {
    tankId: string;
    clarity: number;
    fishCount: number;
  }) => void;
  addAlert: (alert: ReturnType<typeof buildDiseaseAlert>) => void;
}

export interface DetectionProcessorResult {
  result: AIDetectionResult;
  totalFish: number;
  diagnosed: boolean;
}

export async function runFrameDetection(
  blob: Blob,
  signal: AbortSignal,
  diagnose: boolean = false
): Promise<AIDetectionResult> {
  return sendFrameForDetection(
    blob,
    DETECTION_CONFIDENCE,
    diagnose,
    DIAGNOSIS_MIN_CONF,
    signal
  );
}

export async function processDetectionFrame(
  blob: Blob,
  deps: DetectionProcessorDeps,
  signal: AbortSignal
): Promise<DetectionProcessorResult> {
  const diagnose = shouldRunDiagnosis();
  const result = await runFrameDetection(blob, signal, diagnose);

  if (diagnose) {
    recordDiagnosisTime();
    const diagnosedFish = result.detections.find((d) => d.diagnosis);
    if (diagnosedFish?.diagnosis && !diagnosedFish.diagnosis.healthy) {
      deps.addAlert(buildDiseaseAlert(diagnosedFish));
    }
  }

  const totalFish = result.summary.total_detections;

  recordFeedReading({
    tankId: deps.activeTankId,
    liveState: deps.liveState,
    activeFeed: deps.activeFeed,
    clarity: deps.activeFeed.current_clarity ?? 0,
    fishCount: totalFish,
    writeReading: deps.writeReading,
  });

  updateDetectedFromSpeciesCounts(deps.tankId, result.summary.species_counts);

  return { result, totalFish, diagnosed: diagnose };
}
