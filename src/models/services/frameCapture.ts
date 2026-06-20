// frameCapture.ts - Frame capture orchestration for AI inference
import { isVideoReady, captureFrame } from '../api/aiApi';

export { isVideoReady };

export interface FrameCaptureResult {
  blob: Blob;
  width: number;
  height: number;
}

export async function captureVideoFrame(
  video: HTMLVideoElement,
  quality: number = 0.92
): Promise<Blob> {
  if (!isVideoReady(video)) {
    throw new Error('Video element is not ready for frame capture');
  }
  return captureFrame(video, quality);
}
