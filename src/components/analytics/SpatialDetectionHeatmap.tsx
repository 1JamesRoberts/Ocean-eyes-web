import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AIDetectionResult } from '../../types/aquarium';
import { formatSpeciesName } from '../../utils/formatters';
import { useLiveFeed } from '../../hooks/useLiveFeed';
import { CameraFeed } from '../live/CameraFeed';
import { GlassSelect } from '../shared';
import { buildHeatmapOverlay, debounce, type HeatmapCenter } from './heatmapOverlay';

interface Props {
  records: AIDetectionResult[];
  tankId?: string | null;
  inventorySpeciesIds?: Set<string>;
  selectedSpecies: string;
  onSelectedSpeciesChange: (species: string) => void;
}

const MAX_RENDER_WIDTH = 800;

export const SpatialDetectionHeatmap = React.memo<Props>(
  ({
    records,
    tankId: _tankId,
    inventorySpeciesIds,
    selectedSpecies,
    onSelectedSpeciesChange,
  }) => {
    const { activeFeed, isWebcam, isStreaming, videoRef } = useLiveFeed();
    const containerRef = useRef<HTMLDivElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const heatmapTextureRef = useRef<HTMLCanvasElement | null>(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

    const allCenters = useMemo<HeatmapCenter[]>(() => {
      const points: HeatmapCenter[] = [];
      for (const record of records) {
        if (!record.detections) continue;
        for (const detection of record.detections) {
          const [nx1, ny1, nx2, ny2] = detection.bbox_normalized;
          points.push({
            nx: (nx1 + nx2) / 2,
            ny: (ny1 + ny2) / 2,
            species: detection.species,
          });
        }
      }
      return points;
    }, [records]);

    const speciesList = useMemo(
      () =>
        Array.from(new Set(allCenters.map((center) => center.species)))
          .filter(
            (species) =>
              !inventorySpeciesIds ||
              inventorySpeciesIds.size === 0 ||
              inventorySpeciesIds.has(species),
          )
          .sort(),
      [allCenters, inventorySpeciesIds],
    );

    const centers = useMemo(
      () =>
        selectedSpecies === 'all'
          ? allCenters
          : allCenters.filter((center) => center.species === selectedSpecies),
      [allCenters, selectedSpecies],
    );

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

      const initialRect = containerRef.current.getBoundingClientRect();
      updateCanvasSize(initialRect.width, initialRect.height);

      const debouncedUpdate = debounce((entries: ResizeObserverEntry[]) => {
        const contentRect = entries[0].contentRect;
        updateCanvasSize(contentRect.width, contentRect.height);
      }, 200);

      const observer = new ResizeObserver(debouncedUpdate);
      observer.observe(containerRef.current);

      return () => observer.disconnect();
    }, []);

    const drawOverlay = useCallback(() => {
      const canvas = overlayCanvasRef.current;
      const texture = heatmapTextureRef.current;
      if (!canvas || !texture) {
        const ctx = canvas?.getContext('2d');
        if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(texture, 0, 0, canvas.width, canvas.height);
    }, []);

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

    return (
      <div className="size-full bg-black">
        <div ref={containerRef} className="shimmer relative size-full bg-camera-bg">
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
          <div className="absolute inset-0 bg-linear-to-b from-black/20 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-4 z-10">
            <GlassSelect
              value={selectedSpecies}
              onChange={(event) => onSelectedSpeciesChange(event.target.value)}
              className="rounded-full! border-white/20! bg-black/40! px-2.5! py-1! text-2xs font-semibold text-white backdrop-blur-md!"
            >
              <option value="all">All Species</option>
              {speciesList.map((species) => (
                <option key={species} value={species}>
                  {formatSpeciesName(species)}
                </option>
              ))}
            </GlassSelect>
          </div>
        </div>
      </div>
    );
  },
);
