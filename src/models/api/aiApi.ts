// ai_service.ts - Frontend service for FishAI FastAPI backend communication
import type { AIDetectionResult, AITurbidityResult, HistoryDetectionResponse, HistoryTurbidityResponse } from '../../types/aquarium';

export const AI_API_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Custom error class
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
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

interface AvailableDetectionDatesResponse {
  dates: string[];
  latest: string | null;
}

/**
 * Fetch the list of dates with detection history and the latest available date.
 */
export async function fetchAvailableDetectionDates(
  signal?: AbortSignal
): Promise<AvailableDetectionDatesResponse> {
  const res = await fetch(`${AI_API_URL}/history/available-dates`, {
    method: 'GET',
    signal,
  });
  return handleResponse<AvailableDetectionDatesResponse>(res);
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

export function isVideoReady(video: HTMLVideoElement): boolean {
  return (
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
    video.videoWidth > 0 &&
    video.videoHeight > 0
  );
}

/**
 * Capture a frame from a video or image element as a JPEG Blob.
 */
export async function captureFrame(
  source: HTMLVideoElement | HTMLImageElement,
  quality: number = 0.92
): Promise<Blob> {
  const isVideo = source instanceof HTMLVideoElement;

  if (isVideo) {
    const video = source as HTMLVideoElement;
    if (!isVideoReady(video)) {
      throw new Error('Video element is not ready for frame capture');
    }
  } else {
    const img = source as HTMLImageElement;
    if (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
      throw new Error('Image element is not loaded');
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = isVideo ? source.videoWidth : (source as HTMLImageElement).naturalWidth || 640;
  canvas.height = isVideo ? source.videoHeight : (source as HTMLImageElement).naturalHeight || 360;

  if (canvas.width === 0 || canvas.height === 0) {
    throw new Error(`Invalid canvas dimensions: ${canvas.width}x${canvas.height}`);
  }

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
      if (canvas.width === 0 || canvas.height === 0) {
        reject(new Error(`Invalid canvas dimensions: ${canvas.width}x${canvas.height}`));
        return;
      }
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
  diagnosisMinConf: number = 0.6,
  signal?: AbortSignal
): Promise<AIDetectionResult> {
  const formData = new FormData();
  formData.append('file', blob, 'frame.jpg');

  const res = await fetch(`${AI_API_URL}/predict/detection?conf=${conf}&diagnose=${diagnose}&diagnosis_min_conf=${diagnosisMinConf}`, {
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

async function fetchHistoryRange<T>(
  endpoint: string,
  startDate: string,
  endDate: string,
  limit: number = 1000,
  signal?: AbortSignal
): Promise<T> {
  const params = new URLSearchParams();
  params.append('start_date', startDate);
  params.append('end_date', endDate);
  params.append('limit', String(limit));

  const res = await fetch(`${AI_API_URL}${endpoint}?${params.toString()}`, {
    method: 'GET',
    signal,
  });

  return handleResponse<T>(res);
}

/**
 * Fetch detection history across an inclusive date range.
 */
export function fetchDetectionHistoryRange(
  startDate: string,
  endDate: string,
  limit?: number,
  signal?: AbortSignal
): Promise<HistoryDetectionResponse> {
  return fetchHistoryRange<HistoryDetectionResponse>('/history/detections', startDate, endDate, limit, signal);
}

/**
 * Fetch turbidity history across an inclusive date range.
 */
export function fetchTurbidityHistoryRange(
  startDate: string,
  endDate: string,
  limit?: number,
  signal?: AbortSignal
): Promise<HistoryTurbidityResponse> {
  return fetchHistoryRange<HistoryTurbidityResponse>('/history/turbidity', startDate, endDate, limit, signal);
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

async function clearHistoryRange(
  endpoint: string,
  startDate: string,
  endDate: string,
  signal?: AbortSignal
): Promise<{ status: string; deleted: string; files: string[] }> {
  const params = new URLSearchParams();
  params.append('start_date', startDate);
  params.append('end_date', endDate);

  const res = await fetch(`${AI_API_URL}${endpoint}?${params.toString()}`, {
    method: 'DELETE',
    signal,
  });

  return handleResponse<{ status: string; deleted: string; files: string[] }>(res);
}

/**
 * Clear detection history across an inclusive date range.
 */
export function clearDetectionHistoryRange(
  startDate: string,
  endDate: string,
  signal?: AbortSignal
): Promise<{ status: string; deleted: string; files: string[] }> {
  return clearHistoryRange('/history/detections', startDate, endDate, signal);
}

/**
 * Clear turbidity history across an inclusive date range.
 */
export function clearTurbidityHistoryRange(
  startDate: string,
  endDate: string,
  signal?: AbortSignal
): Promise<{ status: string; deleted: string; files: string[] }> {
  return clearHistoryRange('/history/turbidity', startDate, endDate, signal);
}
