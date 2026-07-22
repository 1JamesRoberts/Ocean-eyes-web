// ai_service.ts - Frontend service for FishAI FastAPI backend communication

export const AI_API_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

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
 * Resolve a relative crop_url to an absolute URL using the backend base URL.
 */
export function resolveCropUrl(cropUrl?: string): string | undefined {
  if (!cropUrl) return undefined;
  if (cropUrl.startsWith('http')) return cropUrl;
  return `${AI_API_URL}${cropUrl}`;
}
