// ai_service.ts - Frontend service for FishAI FastAPI backend communication
import type { AIDetectionResult, AITurbidityResult } from '../types/aquarium';

const AI_API_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

/**
 * Check if the AI backend is available and models are loaded.
 */
export async function isBackendAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${AI_API_URL}/health`, { method: 'GET' });
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === 'healthy' && data.models_loaded === true;
  } catch {
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
  height: number = 360
): Promise<Blob> {
  const img = new Image();
  img.crossOrigin = 'anonymous';

  return new Promise((resolve, reject) => {
    img.onload = () => {
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
    img.onerror = () => reject(new Error(`Failed to load image: ${imageUrl}`));
    img.src = imageUrl;
  });
}

/**
 * Send an image Blob to the AI backend for detection + species inference (no turbidity).
 */
export async function sendFrameForDetection(
  blob: Blob,
  conf: number = 0.35
): Promise<AIDetectionResult> {
  const formData = new FormData();
  formData.append('file', blob, 'frame.jpg');

  const res = await fetch(`${AI_API_URL}/predict/detection?conf=${conf}`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `AI backend error: ${res.status}`);
  }

  const data = await res.json();
  return data as AIDetectionResult;
}

/**
 * Send an image Blob to the AI backend for turbidity-only inference.
 */
export async function sendFrameForTurbidity(blob: Blob): Promise<AITurbidityResult> {
  const formData = new FormData();
  formData.append('file', blob, 'frame.jpg');

  const res = await fetch(`${AI_API_URL}/predict/turbidity`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `AI backend error: ${res.status}`);
  }

  const data = await res.json();
  return data as AITurbidityResult;
}

/**
 * Get the list of supported species from the backend.
 */
export async function getSpeciesList(): Promise<{ id: string; display: string }[]> {
  const res = await fetch(`${AI_API_URL}/species`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.species || [];
}
