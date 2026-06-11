// CCTV-style density heatmap overlaid on the aquarium camera frame.
// Algorithm matches data_processing/test.py: density accumulation →
// Gaussian blur → JET colourmap → alpha blend over camera background.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { AIDetectionResult } from '../../types/aquarium';
import { formatSpeciesName } from '../../utils/analytics';
import { ChartEmptyState } from './ChartEmptyState';

interface Props {
  records: AIDetectionResult[];
}

const BG_IMAGE_URL = '/mock_camera_main.png';
const MAX_RENDER_WIDTH = 800;
const HEATMAP_ALPHA = 0.55;
const BLUR_SIGMA_PROP = 0.05; // σ as proportion of image width

// ─── Precomputed JET colourmap LUT (matches OpenCV COLORMAP_JET) ──────────

function jetColor(t: number): [number, number, number] {
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

const JET_LUT: readonly (readonly [number, number, number])[] = Array.from(
  { length: 256 },
  (_, i) => jetColor(i / 255),
);

// ─── Separable Gaussian blur ────────────────────────────────────────────────

function gaussianBlur(
  src: Float32Array,
  w: number,
  h: number,
  sigma: number,
): Float32Array {
  const radius = Math.ceil(sigma * 3);
  const size = radius * 2 + 1;

  // Build normalised 1-D kernel
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

// ─── Component ─────────────────────────────────────────────────────────────

export const SpatialDetectionHeatmap: React.FC<Props> = ({ records }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedSpecies, setSelectedSpecies] = useState<string>('all');
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [bgLoading, setBgLoading] = useState(true);
  const [bgError, setBgError] = useState(false);

  // Load camera background once
  useEffect(() => {
    const img = new Image();
    img.onload = () => { setBgImage(img); setBgLoading(false); };
    img.onerror = () => { setBgError(true); setBgLoading(false); };
    img.src = BG_IMAGE_URL;
  }, []);

  // Flatten records into normalised center points
  const allCenters = useMemo(() => {
    const points: { nx: number; ny: number; species: string }[] = [];
    for (const r of records) {
      if (!r.detections) continue;
      for (const d of r.detections) {
        const [nx1, ny1, nx2, ny2] = d.bbox_normalized;
        points.push({ nx: (nx1 + nx2) / 2, ny: (ny1 + ny2) / 2, species: d.species });
      }
    }
    return points;
  }, [records]);

  // Unique species for the filter dropdown
  const speciesList = useMemo(
    () => Array.from(new Set(allCenters.map((c) => c.species))).sort(),
    [allCenters],
  );

  // Filter centers by selected species
  const centers = useMemo(
    () => (selectedSpecies === 'all' ? allCenters : allCenters.filter((c) => c.species === selectedSpecies)),
    [allCenters, selectedSpecies],
  );

  // Render the heatmap whenever inputs change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bgImage || centers.length === 0) return;

    const naturalW = bgImage.naturalWidth || 640;
    const naturalH = bgImage.naturalHeight || 360;
    const renderW = Math.min(MAX_RENDER_WIDTH, naturalW);
    const renderH = Math.round(renderW * (naturalH / naturalW));
    canvas.width = renderW;
    canvas.height = renderH;

    const sigma = Math.max(1, Math.round(renderW * BLUR_SIGMA_PROP));

    // 1. Float32 density accumulation
    const density = new Float32Array(renderW * renderH);
    for (const c of centers) {
      const px = Math.round(c.nx * (renderW - 1));
      const py = Math.round(c.ny * (renderH - 1));
      if (px >= 0 && px < renderW && py >= 0 && py < renderH) {
        density[py * renderW + px] += 1;
      }
    }

    // 2. Gaussian blur
    const blurred = gaussianBlur(density, renderW, renderH, sigma);

    // 3. Find max, build colourised ImageData via JET LUT
    const ctx = canvas.getContext('2d')!;
    let maxVal = 0;
    for (let i = 0; i < blurred.length; i++) {
      if (blurred[i] > maxVal) maxVal = blurred[i];
    }

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

    // 4. Composite over background via offscreen canvas.
    //    putImageData replaces pixels (no blend), so we draw it onto a temp
    //    canvas, then drawImage blends it with alpha.
    ctx.clearRect(0, 0, renderW, renderH);
    ctx.drawImage(bgImage, 0, 0, renderW, renderH);
    let offscreen = offscreenRef.current;
    if (!offscreen || offscreen.width !== renderW || offscreen.height !== renderH) {
      offscreen = document.createElement('canvas');
      offscreen.width = renderW;
      offscreen.height = renderH;
      offscreenRef.current = offscreen;
    }
    const offCtx = offscreen.getContext('2d')!;
    offCtx.putImageData(imageData, 0, 0);
    ctx.drawImage(offscreen, 0, 0);
  }, [bgImage, centers]);

  // ── Render ──

  if (allCenters.length === 0) {
    return <ChartEmptyState message="No detection data available" />;
  }

  if (bgLoading) {
    return (
      <div className="flex items-center justify-center gap-2.5 h-[200px] text-text-muted text-[13px]">
        <Loader2 size={24} className="animate-float-1 text-info" />
        <span className="text-[13px] text-text-muted">Loading camera frame...</span>
      </div>
    );
  }

  if (bgError) {
    return <ChartEmptyState message="Failed to load camera frame" hint="Check that mock_camera_main.png exists in public/" />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <select
          className="py-1.5 px-2.5 rounded-lg border border-border-card bg-surface-card text-text-main text-[13px] font-inherit cursor-pointer outline-none focus:border-info"
          value={selectedSpecies}
          onChange={(e) => setSelectedSpecies(e.target.value)}
        >
          <option value="all">All Species</option>
          {speciesList.map((s) => (
            <option key={s} value={s}>
              {formatSpeciesName(s)}
            </option>
          ))}
        </select>
      </div>
      <canvas ref={canvasRef} className="w-full h-auto block rounded-xl bg-camera-bg" />
    </div>
  );
};
