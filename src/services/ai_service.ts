// ai_service.ts - Frontend service for FishAI FastAPI backend communication
import type { AIDetectionResult, AITurbidityResult, HistoryDetectionResponse, HistoryTurbidityResponse } from '../types/aquarium';

export const AI_API_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Custom error class
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.error || `AI backend error: ${res.status}`;
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

async function fetchHistory<T>(
  endpoint: string,
  date?: string,
  limit: number = 1000,
  signal?: AbortSignal
): Promise<T> {
  const params = new URLSearchParams();
  if (date) params.append('date', date);
  params.append('limit', String(limit));

  const res = await fetch(`${AI_API_URL}${endpoint}?${params.toString()}`, {
    method: 'GET',
    signal,
  });

  return handleResponse<T>(res);
}

/**
 * Check if the AI backend is available and models are loaded.
 */
export async function isBackendAvailable(signal?: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch(`${AI_API_URL}/health`, { method: 'GET', signal });
    if (!res.ok) {
      console.warn('[AI Service] Health check HTTP error:', res.status);
      return false;
    }
    const data = await res.json();
    return data.status === 'healthy' && data.models_loaded === true;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return false;
    console.warn('[AI Service] Health check failed:', err);
    return false;
  }
}

/**
 * Capture a frame from a video or image element as a JPEG Blob.
 */
export async function captureFrame(
  source: HTMLVideoElement | HTMLImageElement,
  quality: number = 0.92
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const isVideo = source instanceof HTMLVideoElement;
  canvas.width = isVideo ? source.videoWidth : (source as HTMLImageElement).naturalWidth || 640;
  canvas.height = isVideo ? source.videoHeight : (source as HTMLImageElement).naturalHeight || 360;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas 2d context');
  }

  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob returned null'));
      },
      'image/jpeg',
      quality
    );
  });
}

/**
 * Capture a frame from an image URL (for mock images).
 */
export async function captureFrameFromUrl(
  imageUrl: string,
  width: number = 640,
  height: number = 360,
  signal?: AbortSignal
): Promise<Blob> {
  const img = new Image();
  // Only set crossOrigin for non-local URLs to avoid CORS failures on local mocks
  if (!imageUrl.startsWith('/') && !imageUrl.startsWith(window.location.origin)) {
    img.crossOrigin = 'anonymous';
  }

  return new Promise((resolve, reject) => {
    const onAbort = () => {
      img.src = '';
      reject(new Error('Image load aborted'));
    };
    if (signal) {
      signal.addEventListener('abort', onAbort);
      if (signal.aborted) {
        onAbort();
        return;
      }
    }

    img.onload = () => {
      if (signal) signal.removeEventListener('abort', onAbort);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas 2d context'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob returned null'));
        },
        'image/jpeg',
        0.92
      );
    };
    img.onerror = () => {
      if (signal) signal.removeEventListener('abort', onAbort);
      reject(new Error(`Failed to load image: ${imageUrl}`));
    };
    img.src = imageUrl;
  });
}

/**
 * Send an image Blob to the AI backend for detection + species inference (no turbidity).
 */
export async function sendFrameForDetection(
  blob: Blob,
  conf: number = 0.35,
  diagnose: boolean = false,
  signal?: AbortSignal
): Promise<AIDetectionResult> {
  const formData = new FormData();
  formData.append('file', blob, 'frame.jpg');

  const res = await fetch(`${AI_API_URL}/predict/detection?conf=${conf}&diagnose=${diagnose}`, {
    method: 'POST',
    body: formData,
    signal,
  });

  return handleResponse<AIDetectionResult>(res);
}

/**
 * Send an image Blob to the AI backend for turbidity-only inference.
 */
export async function sendFrameForTurbidity(blob: Blob, signal?: AbortSignal): Promise<AITurbidityResult> {
  const formData = new FormData();
  formData.append('file', blob, 'frame.jpg');

  const res = await fetch(`${AI_API_URL}/predict/turbidity`, {
    method: 'POST',
    body: formData,
    signal,
  });

  return handleResponse<AITurbidityResult>(res);
}

/**
 * Fetch detection history for a given date from the backend.
 */
export function fetchDetectionHistory(
  date?: string,
  limit?: number,
  signal?: AbortSignal
): Promise<HistoryDetectionResponse> {
  return fetchHistory<HistoryDetectionResponse>('/history/detections', date, limit, signal);
}

/**
 * Fetch turbidity history for a given date from the backend.
 */
export function fetchTurbidityHistory(
  date?: string,
  limit?: number,
  signal?: AbortSignal
): Promise<HistoryTurbidityResponse> {
  return fetchHistory<HistoryTurbidityResponse>('/history/turbidity', date, limit, signal);
}

/**
 * Resolve a relative crop_url to an absolute URL using the backend base URL.
 */
export function resolveCropUrl(cropUrl?: string): string | undefined {
  if (!cropUrl) return undefined;
  if (cropUrl.startsWith('http')) return cropUrl;
  return `${AI_API_URL}${cropUrl}`;
}

/**
 * Clear detection history for a given date on the backend.
 */
export async function clearDetectionHistory(
  date?: string,
  signal?: AbortSignal
): Promise<{ status: string; deleted: string }> {
  const params = new URLSearchParams();
  if (date) params.append('date', date);

  const res = await fetch(`${AI_API_URL}/history/detections?${params.toString()}`, {
    method: 'DELETE',
    signal,
  });

  return handleResponse<{ status: string; deleted: string }>(res);
}

/**
 * Clear turbidity history for a given date on the backend.
 */
export async function clearTurbidityHistory(
  date?: string,
  signal?: AbortSignal
): Promise<{ status: string; deleted: string }> {
  const params = new URLSearchParams();
  if (date) params.append('date', date);

  const res = await fetch(`${AI_API_URL}/history/turbidity?${params.toString()}`, {
    method: 'DELETE',
    signal,
  });

  return handleResponse<{ status: string; deleted: string }>(res);
}
