// Pure heatmap algorithms shared between the main thread and Web Worker.
// NOTE: No DOM APIs here — this file is also compiled under the Worker tsconfig
// (lib: WebWorker) where `document` is unavailable.

export function jetColor(t: number): [number, number, number] {
  const c = Math.max(0, Math.min(1, t));
  if (c < 0.125) {
    const p = c / 0.125;
    return [0, 0, Math.round(128 + p * 127)];
  } else if (c < 0.375) {
    const p = (c - 0.125) / 0.25;
    return [0, Math.round(p * 255), 255];
  } else if (c < 0.625) {
    const p = (c - 0.375) / 0.25;
    return [Math.round(p * 255), 255, Math.round((1 - p) * 255)];
  } else if (c < 0.875) {
    const p = (c - 0.625) / 0.25;
    return [255, Math.round((1 - p) * 255), 0];
  } else {
    const p = (c - 0.875) / 0.125;
    return [Math.round(255 - p * 127), 0, 0];
  }
}

export const JET_LUT: readonly (readonly [number, number, number])[] = Array.from(
  { length: 256 },
  (_, i) => jetColor(i / 255),
);

/**
 * Separable Gaussian blur (two-pass: horizontal then vertical).
 * Returns a new Float32Array of length w × h.
 */
export function gaussianBlur(
  src: Float32Array,
  w: number,
  h: number,
  sigma: number,
): Float32Array {
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

  // Horizontal pass
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

  // Vertical pass
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


