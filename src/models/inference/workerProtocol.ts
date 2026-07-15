import type { AIDetectionResult, AITurbidityResult } from '../../types/aquarium';

export type InferenceRequest =
  | {
      id: number;
      operation: 'detect';
      image: Blob;
      confidence: number;
    }
  | {
      id: number;
      operation: 'turbidity';
      image: Blob;
    };

export type InferenceResult = AIDetectionResult | AITurbidityResult;

export type InferenceResponse =
  | { id: number; ok: true; result: InferenceResult }
  | { id: number; ok: false; error: string };
