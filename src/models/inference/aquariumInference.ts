import type { AIDetectionResult, AITurbidityResult } from '../../types/aquarium';
import type { InferenceRequest, InferenceResponse, InferenceResult } from './workerProtocol';

interface PendingRequest {
  resolve: (result: InferenceResult) => void;
  reject: (error: Error) => void;
  removeAbortListener: () => void;
}

let worker: Worker | null = null;
let nextRequestId = 1;
const pendingRequests = new Map<number, PendingRequest>();

function rejectAllPending(error: Error): void {
  for (const pending of pendingRequests.values()) {
    pending.removeAbortListener();
    pending.reject(error);
  }
  pendingRequests.clear();
}

function getWorker(): Worker {
  if (worker) return worker;

  worker = new Worker(new URL('./inference.worker.ts', import.meta.url), { type: 'module' });
  worker.addEventListener('message', (event: MessageEvent<InferenceResponse>) => {
    const pending = pendingRequests.get(event.data.id);
    if (!pending) return;

    pendingRequests.delete(event.data.id);
    pending.removeAbortListener();
    if (event.data.ok) pending.resolve(event.data.result);
    else pending.reject(new Error(event.data.error));
  });
  worker.addEventListener('error', () => {
    rejectAllPending(new Error('On-device AI worker stopped unexpectedly'));
    worker?.terminate();
    worker = null;
  });
  return worker;
}

function runInference(request: InferenceRequest, signal?: AbortSignal): Promise<InferenceResult> {
  if (signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));

  return new Promise((resolve, reject) => {
    const abort = () => {
      if (!pendingRequests.delete(request.id)) return;
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', abort, { once: true });

    pendingRequests.set(request.id, {
      resolve,
      reject,
      removeAbortListener: () => signal?.removeEventListener('abort', abort),
    });
    getWorker().postMessage(request);
  });
}

export function isOnDeviceInferenceSupported(): boolean {
  return (
    typeof Worker !== 'undefined' &&
    typeof OffscreenCanvas !== 'undefined' &&
    typeof createImageBitmap !== 'undefined'
  );
}

export async function detectFishOnDevice(
  image: Blob,
  confidence = 0.35,
  signal?: AbortSignal
): Promise<AIDetectionResult> {
  const result = await runInference(
    { id: nextRequestId++, operation: 'detect', image, confidence },
    signal
  );
  return result as AIDetectionResult;
}

export async function measureTurbidityOnDevice(
  image: Blob,
  signal?: AbortSignal
): Promise<AITurbidityResult> {
  const result = await runInference(
    { id: nextRequestId++, operation: 'turbidity', image },
    signal
  );
  return result as AITurbidityResult;
}
