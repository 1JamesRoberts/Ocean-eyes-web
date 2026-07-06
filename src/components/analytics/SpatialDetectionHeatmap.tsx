// CCTV-style density heatmap overlaid on the aquarium camera frame.
// Algorithm matches data_processing/test.py: density accumulation →
// Gaussian blur → JET colourmap → alpha blend over camera background.
import React, { useEffect, useMemo, useRef, useCallback } from "react";
import type { AIDetectionResult } from "../../types/aquarium";
import { formatSpeciesName } from "../../utils/formatters";
import { useLiveFeed } from "../../hooks/useLiveFeed";
import { CameraFeed } from "../live/CameraFeed";
import { GlassSelect } from "../shared";

interface Props {
  records: AIDetectionResult[];
  /** Tank ID to resolve the active camera feed. */
  tankId?: string | null;
  /** Set of species IDs that exist in the tank inventory (filters the dropdown). */
  inventorySpeciesIds?: Set<string>;
  /** Currently selected species filter. Controls the heatmap and external charts. */
  selectedSpecies: string;
  /** Called when the user changes the species filter. */
  onSelectedSpeciesChange: (species: string) => void;
}

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

// ─── Heatmap overlay builder ───────────────────────────────────────────────

function buildHeatmapOverlay(
  centers: { nx: number; ny: number; species: string }[],
  renderW: number,
  renderH: number,
): HTMLCanvasElement | null {
  if (centers.length === 0) return null;

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
  let maxVal = 0;
  for (let i = 0; i < blurred.length; i++) {
    if (blurred[i] > maxVal) maxVal = blurred[i];
  }

  // 4. Build overlay canvas
  const overlay = document.createElement("canvas");
  overlay.width = renderW;
  overlay.height = renderH;
  const ctx = overlay.getContext("2d")!;
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

// ─── Component ─────────────────────────────────────────────────────────────

function debounce<T extends (...args: Parameters<T>) => void>(
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

export const SpatialDetectionHeatmap = React.memo<Props>(
  ({
    records,
    tankId,
    inventorySpeciesIds,
    selectedSpecies,
    onSelectedSpeciesChange,
  }) => {
    const { activeFeed, isWebcam, isStreaming, videoRef } = useLiveFeed(
      tankId ?? null,
    );
    const containerRef = useRef<HTMLDivElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const heatmapTextureRef = useRef<HTMLCanvasElement | null>(null);
    const [containerSize, setContainerSize] = React.useState({
      width: 0,
      height: 0,
    });

    // Flatten records into normalised center points
    const allCenters = useMemo(() => {
      const points: { nx: number; ny: number; species: string }[] = [];
      for (const r of records) {
        if (!r.detections) continue;
        for (const d of r.detections) {
          const [nx1, ny1, nx2, ny2] = d.bbox_normalized;
          points.push({
            nx: (nx1 + nx2) / 2,
            ny: (ny1 + ny2) / 2,
            species: d.species,
          });
        }
      }
      return points;
    }, [records]);

    // Unique species for the filter dropdown — only those in the tank inventory
    const speciesList = useMemo(
      () =>
        Array.from(new Set(allCenters.map((c) => c.species)))
          .filter(
            (s) =>
              !inventorySpeciesIds ||
              inventorySpeciesIds.size === 0 ||
              inventorySpeciesIds.has(s),
          )
          .sort(),
      [allCenters, inventorySpeciesIds],
    );

    // Filter centers by selected species
    const centers = useMemo(
      () =>
        selectedSpecies === "all"
          ? allCenters
          : allCenters.filter((c) => c.species === selectedSpecies),
      [allCenters, selectedSpecies],
    );

    // ResizeObserver: keep overlay canvas sized to container pixels
    useEffect(() => {
      if (!containerRef.current) return;

      const updateCanvasSize = (width: number, height: number) => {
        setContainerSize({ width, height });

        const canvas = overlayCanvasRef.current;
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        const newWidth = Math.round(width * dpr);
        const newHeight = Math.round(height * dpr);

        if (canvas.width !== newWidth || canvas.height !== newHeight) {
          canvas.width = newWidth;
          canvas.height = newHeight;
        }
      };

      // Initial synchronous measurement
      const initialRect = containerRef.current.getBoundingClientRect();
      updateCanvasSize(initialRect.width, initialRect.height);

      const debouncedUpdate = debounce((entries: ResizeObserverEntry[]) => {
        const cr = entries[0].contentRect;
        updateCanvasSize(cr.width, cr.height);
      }, 200);

      const ro = new ResizeObserver(debouncedUpdate);

      ro.observe(containerRef.current);
      return () => {
        ro.disconnect();
      };
    }, []);

    const drawOverlay = useCallback(() => {
      const canvas = overlayCanvasRef.current;
      const texture = heatmapTextureRef.current;
      if (!canvas || !texture) {
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(texture, 0, 0, canvas.width, canvas.height);
    }, []);

    // Build heatmap texture whenever centers or container size change
    useEffect(() => {
      if (centers.length === 0) {
        heatmapTextureRef.current = null;
        drawOverlay();
        return;
      }

      const { width, height } = containerSize;
      if (width === 0 || height === 0) return;

      const workW = Math.min(MAX_RENDER_WIDTH, Math.round(width));
      const workH = Math.round(workW * (height / width));

      heatmapTextureRef.current = buildHeatmapOverlay(centers, workW, workH);
      drawOverlay();
    }, [centers, containerSize, drawOverlay]);

    // ── Render ──

    return (
      <section className="
        sticky top-0 z-20 -mx-4 -mt-4 h-[221px] w-[calc(100%+2rem)]
        cursor-pointer overflow-hidden bg-black
      ">
        <div
          ref={containerRef}
          className="shimmer relative size-full bg-camera-bg"
        >
          <CameraFeed
            feed={activeFeed}
            isStreaming={isStreaming}
            isWebcam={isWebcam}
            videoRef={videoRef}
            className="size-full"
            videoClassName="h-full w-full object-cover"
          />
          <canvas
            ref={overlayCanvasRef}
            className="pointer-events-none absolute inset-0 size-full"
          />
          <div className="
            absolute inset-0 bg-linear-to-b from-black/20 via-transparent
            to-transparent
          " />
          <div className="absolute bottom-3 left-4 z-10">
            <GlassSelect
              value={selectedSpecies}
              onChange={(e) => onSelectedSpeciesChange(e.target.value)}
              className="
                rounded-full! border-white/20! bg-black/40! px-2.5! py-1!
                text-2xs font-semibold text-white backdrop-blur-md!
              "
            >
              <option value="all">All Species</option>
              {speciesList.map((s) => (
                <option key={s} value={s}>
                  {formatSpeciesName(s)}
                </option>
              ))}
            </GlassSelect>
          </div>
        </div>
      </section>
    );
  },
);
