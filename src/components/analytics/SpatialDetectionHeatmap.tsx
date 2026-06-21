// CCTV-style density heatmap overlaid on the aquarium camera frame.
// Algorithm matches data_processing/test.py: density accumulation →
// Gaussian blur → JET colourmap → alpha blend over camera background.
import React, { useEffect, useMemo, useRef, useCallback } from 'react';
import type { AIDetectionResult } from '../../types/aquarium';
import { formatSpeciesName } from '../../utils/formatters';
import { debounce } from '../../utils/helpers';
import { useLiveFeed } from '../../hooks/useLiveFeed';
import { CameraFeed } from '../live/CameraFeed';
import { ChartEmptyState } from './ChartEmptyState';
import { gaussianBlur, JET_LUT } from '../../models/services/heatmap';

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
const BLUR_SIGMA_PROP = 0.03; // σ as proportion of image width

// ─── Main-thread fallback (used when OffscreenCanvas / Worker is unavailable) ──

function buildHeatmapOverlay(
  centers: { nx: number; ny: number }[],
  renderW: number,
  renderH: number,
  sigma: number,
  alpha: number,
): HTMLCanvasElement | null {
  if (centers.length === 0) return null;

  const density = new Float32Array(renderW * renderH);
  for (const c of centers) {
    const px = Math.round(c.nx * (renderW - 1));
    const py = Math.round(c.ny * (renderH - 1));
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
  const ctx = overlay.getContext('2d')!;
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
  return overlay;
}

// ─── Component ─────────────────────────────────────────────────────────────

export const SpatialDetectionHeatmap = React.memo<Props>(
  ({ records, tankId, inventorySpeciesIds, selectedSpecies, onSelectedSpeciesChange }) => {
    const { activeFeed, isWebcam, isStreaming, videoRef } = useLiveFeed(tankId ?? null);
    const containerRef = useRef<HTMLDivElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const workerRef = useRef<Worker | null>(null);
    const requestIdRef = useRef(0);
    const rafScheduledRef = useRef(false);
    const pendingBitmapRef = useRef<ImageBitmap | null>(null);
    const [containerSize, setContainerSize] = React.useState({ width: 0, height: 0 });
    const [videoSize, setVideoSize] = React.useState<{ width: number; height: number } | null>(null);

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

    // Unique species for the filter dropdown — only those in the tank inventory
    const speciesList = useMemo(
      () =>
        Array.from(new Set(allCenters.map((c) => c.species)))
          .filter((s) => !inventorySpeciesIds || inventorySpeciesIds.has(s))
          .sort(),
      [allCenters, inventorySpeciesIds],
    );

    // Filter centers by selected species
    const centers = useMemo(
      () => (selectedSpecies === 'all' ? allCenters : allCenters.filter((c) => c.species === selectedSpecies)),
      [allCenters, selectedSpecies],
    );

    // Initialize Web Worker on mount
    useEffect(() => {
      const hasOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';
      if (!hasOffscreenCanvas) return;

      try {
        const worker = new Worker(
          new URL('../../models/workers/heatmap.worker.ts', import.meta.url),
          { type: 'module' },
        );

        worker.onmessage = (e: MessageEvent) => {
          const { type, bitmap, requestId } = e.data;
          if (type !== 'result') return;

          // Discard stale responses from outdated requests
          if (requestId !== requestIdRef.current) {
            bitmap.close();
            return;
          }

          // Close the previous bitmap to avoid an ImageBitmap memory leak
          const prev = pendingBitmapRef.current;
          if (prev) prev.close();
          pendingBitmapRef.current = bitmap;

          if (!rafScheduledRef.current) {
            rafScheduledRef.current = true;
            requestAnimationFrame(() => {
              rafScheduledRef.current = false;
              drawOverlay();
            });
          }
        };

        workerRef.current = worker;
      } catch {
        // Worker creation failed — will fall back to inline computation
      }

      return () => {
        workerRef.current?.terminate();
        workerRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const drawOverlay = useCallback(() => {
      const canvas = overlayCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const bitmap = pendingBitmapRef.current;
      if (bitmap) {
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      }

      // Bitmap has been consumed; clear the ref so it isn't re-drawn on next cycle
      pendingBitmapRef.current = null;
    }, []);

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

    // Build heatmap whenever centers or container size change
    useEffect(() => {
      if (centers.length === 0) {
        pendingBitmapRef.current = null;
        drawOverlay();
        return;
      }

      const { width, height } = containerSize;
      if (width === 0 || height === 0) return;

      const workW = Math.min(MAX_RENDER_WIDTH, Math.round(width));
      const workH = Math.round(workW * (height / width));

      const hasOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';
      const worker = workerRef.current;

      if (hasOffscreenCanvas && worker) {
        // Use Web Worker for off-thread computation
        const requestId = ++requestIdRef.current;

        // Flatten centers to Float32Array for transfer
        const centroids = new Float32Array(centers.length * 2);
        for (let i = 0; i < centers.length; i++) {
          centroids[i * 2] = centers[i].nx;
          centroids[i * 2 + 1] = centers[i].ny;
        }

        worker.postMessage(
          {
            type: 'compute',
            centroids,
            renderW: workW,
            renderH: workH,
            sigma: BLUR_SIGMA_PROP,
            alpha: HEATMAP_ALPHA,
            requestId,
          },
          [centroids.buffer],
        );
      } else {
        // Fallback: inline computation on the main thread
        pendingBitmapRef.current = null;
        const sigma = Math.max(1, Math.round(workW * BLUR_SIGMA_PROP));
        const texture = buildHeatmapOverlay(centers, workW, workH, sigma, HEATMAP_ALPHA);
        const canvas = overlayCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (texture) {
          ctx.drawImage(texture, 0, 0, canvas.width, canvas.height);
        }
      }
    }, [centers, containerSize, drawOverlay]);

    // ── Render ──

    if (allCenters.length === 0) {
      return <ChartEmptyState message="No detection data available" />;
    }

    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="m-0 text-sm font-bold text-text-main">Detection Density Heatmap</h3>
          </div>
          <select
            className="
              cursor-pointer rounded-lg border border-border-card
              bg-surface-card px-2.5 py-1.5 text-[13px] text-text-main
              outline-none
              focus:border-info
            "
            value={selectedSpecies}
            onChange={(e) => onSelectedSpeciesChange(e.target.value)}
          >
            <option value="all">All Species</option>
            {speciesList.map((s) => (
              <option key={s} value={s}>
                {formatSpeciesName(s)}
              </option>
            ))}
          </select>
        </div>

        <div
          ref={containerRef}
          className="relative w-full overflow-hidden rounded-xl bg-camera-bg"
          style={
            videoSize
              ? { aspectRatio: `${videoSize.width} / ${videoSize.height}` }
              : undefined
          }
        >
          <CameraFeed
            feed={activeFeed}
            isStreaming={isStreaming}
            isWebcam={isWebcam}
            videoRef={videoRef}
            className="w-full"
            onDimensions={(width, height) => {
              if (width > 0 && height > 0) {
                setVideoSize({ width, height });
              }
            }}
          />
          <canvas
            ref={overlayCanvasRef}
            className="pointer-events-none absolute inset-0 size-full"
          />
        </div>
      </div>
    );
  },
  // Note: Uses `.size` as a cheap proxy for Set equality. This is acceptable for the
  // current use case because the inventory set only grows/shrinks when the user changes
  // which tank is selected. A deep element-by-element comparison would be O(n) and
  // unnecessary here.
  (prevProps, nextProps) =>
    prevProps.tankId === nextProps.tankId &&
    prevProps.records === nextProps.records &&
    prevProps.selectedSpecies === nextProps.selectedSpecies &&
    (prevProps.inventorySpeciesIds === nextProps.inventorySpeciesIds ||
      prevProps.inventorySpeciesIds?.size === nextProps.inventorySpeciesIds?.size),
);
