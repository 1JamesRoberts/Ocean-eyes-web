const HEATMAP_ALPHA = 0.55;
const BLUR_SIGMA_PROP = 0.05;

export interface HeatmapCenter {
  nx: number;
  ny: number;
  species: string;
}

export interface ObjectCoverRect {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

/** Match the centered crop produced by CSS `object-fit: cover`. */
export function calculateObjectCoverRect(
  sourceWidth: number,
  sourceHeight: number,
  containerWidth: number,
  containerHeight: number,
): ObjectCoverRect {
  if (
    sourceWidth <= 0 ||
    sourceHeight <= 0 ||
    containerWidth <= 0 ||
    containerHeight <= 0
  ) {
    return { width: 0, height: 0, offsetX: 0, offsetY: 0 };
  }

  const scale = Math.max(
    containerWidth / sourceWidth,
    containerHeight / sourceHeight,
  );
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;

  return {
    width,
    height,
    offsetX: (containerWidth - width) / 2,
    offsetY: (containerHeight - height) / 2,
  };
}

function jetColor(t: number): [number, number, number] {
  const c = Math.max(0, Math.min(1, t));
  if (c < 0.125) {
    const p = c / 0.125;
    return [0, 0, Math.round(128 + p * 127)];
  }
  if (c < 0.375) {
    const p = (c - 0.125) / 0.25;
    return [0, Math.round(p * 255), 255];
  }
  if (c < 0.625) {
    const p = (c - 0.375) / 0.25;
    return [Math.round(p * 255), 255, Math.round((1 - p) * 255)];
  }
  if (c < 0.875) {
    const p = (c - 0.625) / 0.25;
    return [255, Math.round((1 - p) * 255), 0];
  }

  const p = (c - 0.875) / 0.125;
  return [Math.round(255 - p * 127), 0, 0];
}

const JET_LUT: readonly (readonly [number, number, number])[] = Array.from(
  { length: 256 },
  (_, i) => jetColor(i / 255),
);

function gaussianBlur(src: Float32Array, w: number, h: number, sigma: number): Float32Array {
  const radius = Math.ceil(sigma * 3);
  const size = radius * 2 + 1;
  const kernel = new Float32Array(size);
  let sum = 0;

  for (let i = 0; i < size; i++) {
    const x = i - radius;
    kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
    sum += kernel[i];
  }
  for (let i = 0; i < size; i++) kernel[i] /= sum;

  const temp = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const off = y * w;
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let k = 0; k < size; k++) {
        const sx = x + k - radius;
        if (sx >= 0 && sx < w) acc += src[off + sx] * kernel[k];
      }
      temp[off + x] = acc;
    }
  }

  const dst = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let k = 0; k < size; k++) {
        const sy = y + k - radius;
        if (sy >= 0 && sy < h) acc += temp[sy * w + x] * kernel[k];
      }
      dst[y * w + x] = acc;
    }
  }

  return dst;
}

export function buildHeatmapOverlay(
  centers: HeatmapCenter[],
  renderW: number,
  renderH: number,
): HTMLCanvasElement | null {
  if (centers.length === 0) return null;

  const sigma = Math.max(1, Math.round(renderW * BLUR_SIGMA_PROP));
  const density = new Float32Array(renderW * renderH);

  for (const center of centers) {
    const px = Math.round(center.nx * (renderW - 1));
    const py = Math.round(center.ny * (renderH - 1));
    if (px >= 0 && px < renderW && py >= 0 && py < renderH) {
      density[py * renderW + px] += 1;
    }
  }

  const blurred = gaussianBlur(density, renderW, renderH, sigma);
  let maxVal = 0;
  for (let i = 0; i < blurred.length; i++) {
    if (blurred[i] > maxVal) maxVal = blurred[i];
  }

  const overlay = document.createElement('canvas');
  overlay.width = renderW;
  overlay.height = renderH;
  const ctx = overlay.getContext('2d');
  if (!ctx) return null;

  const imageData = ctx.createImageData(renderW, renderH);
  const pixels = imageData.data;

  if (maxVal > 0) {
    const alpha255 = Math.round(HEATMAP_ALPHA * 255);
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
  return overlay;
}

export function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  ms: number,
) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId !== null) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      timeoutId = null;
      fn(...args);
    }, ms);
  };
}
