// heatmap.worker.ts - Web Worker for heatmap computation
// Runs the full density → Gaussian blur → JET colourmap → bitmap pipeline
// off the main thread.

import { JET_LUT, gaussianBlur } from '../services/heatmap';

// ─── Heatmap overlay builder ───────────────────────────────────────────────

function buildHeatmapOverlay(
  centroids: Float32Array, // flattened [nx, ny] pairs
  renderW: number,
  renderH: number,
  sigma: number,
  alpha: number,
): ImageBitmap {
  const len = centroids.length / 2;

  // 1. Float32 density accumulation
  const density = new Float32Array(renderW * renderH);
  for (let i = 0; i < len; i++) {
    const nx = centroids[i * 2];
    const ny = centroids[i * 2 + 1];
    const px = Math.round(nx * (renderW - 1));
    const py = Math.round(ny * (renderH - 1));
    if (px >= 0 && px < renderW && py >= 0 && py < renderH) {
      density[py * renderW + px] += 1;
    }
  }

  // 2. Gaussian blur
  const blurred = gaussianBlur(density, renderW, renderH, sigma);

  // 3. Find max, build colourised ImageData via JET LUT
  let maxVal = 0;
  for (let i = 0; i < blurred.length; i++) {
    if (blurred[i] > maxVal) maxVal = blurred[i];
  }

  // 4. Render to OffscreenCanvas and return bitmap
  const canvas = new OffscreenCanvas(renderW, renderH);
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(renderW, renderH);
  const pixels = imageData.data;

  if (maxVal > 0) {
    const alpha255 = Math.round(alpha * 255);
    for (let i = 0; i < blurred.length; i++) {
      const lutIdx = Math.round((blurred[i] / maxVal) * 255);
      const [r, g, b] = JET_LUT[lutIdx];
      const off = i * 4;
      pixels[off] = r;
      pixels[off + 1] = g;
      pixels[off + 2] = b;
      pixels[off + 3] = alpha255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.transferToImageBitmap();
}

// ─── Message types ─────────────────────────────────────────────────────────

interface HeatmapRequest {
  type: 'compute';
  centroids: Float32Array; // flattened [nx, ny] pairs
  renderW: number;
  renderH: number;
  sigma: number;
  alpha: number;
  requestId: number;
}

interface HeatmapResponse {
  type: 'result';
  bitmap: ImageBitmap;
  renderW: number;
  renderH: number;
  requestId: number;
}

// ─── Worker message handler ────────────────────────────────────────────────

let latestRequestId = -1;

self.onmessage = (e: MessageEvent<HeatmapRequest>) => {
  const req = e.data;
  if (req.type !== 'compute') return;

  // If a newer request has already been queued, skip this one
  if (req.requestId < latestRequestId) return;
  latestRequestId = req.requestId;

  const sigma = Math.max(1, Math.round(req.renderW * req.sigma));

  const bitmap = buildHeatmapOverlay(
    req.centroids,
    req.renderW,
    req.renderH,
    sigma,
    req.alpha,
  );

  // Check again after computation (may have been superseded by a queued message)
  if (req.requestId !== latestRequestId) {
    bitmap.close();
    return;
  }

  const response: HeatmapResponse = {
    type: 'result',
    bitmap,
    renderW: req.renderW,
    renderH: req.renderH,
    requestId: req.requestId,
  };

  // Transfer the bitmap to the main thread
  postMessage(response, [bitmap]);
};
