import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AIDetectionResult } from '../../types/aquarium';
import { formatSpeciesName } from '../../utils/formatters';
import {
  buildHeatmapOverlay,
  calculateObjectCoverRect,
  debounce,
  type HeatmapCenter,
} from './heatmapOverlay';

interface SpatialDetectionHeatmapOverlayProps {
  records: AIDetectionResult[];
  inventorySpeciesIds?: Set<string>;
  selectedSpecies: string;
  onSelectedSpeciesChange: (species: string) => void;
  visible?: boolean;
  leadingControl?: React.ReactNode;
}

const MAX_RENDER_WIDTH = 800;
const DEFAULT_SOURCE_SIZE = { width: 16, height: 9 };

export const SpatialDetectionHeatmapOverlay = React.memo<SpatialDetectionHeatmapOverlayProps>(
  ({
    records,
    inventorySpeciesIds,
    selectedSpecies,
    onSelectedSpeciesChange,
    visible = true,
    leadingControl,
  }) => {
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

    const sourceSize = useMemo(() => {
      for (let index = records.length - 1; index >= 0; index -= 1) {
        const dimensions = records[index].image_dimensions;
        if (dimensions && dimensions.width > 0 && dimensions.height > 0) {
          return dimensions;
        }
      }

      return DEFAULT_SOURCE_SIZE;
    }, [records]);

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
      const coverRect = calculateObjectCoverRect(
        texture.width,
        texture.height,
        canvas.width,
        canvas.height,
      );
      ctx.drawImage(
        texture,
        coverRect.offsetX,
        coverRect.offsetY,
        coverRect.width,
        coverRect.height,
      );
    }, []);

    useEffect(() => {
      if (centers.length === 0) {
        heatmapTextureRef.current = null;
        drawOverlay();
        return;
      }

      const { width, height } = containerSize;
      if (width === 0 || height === 0) return;

      const workW = Math.min(MAX_RENDER_WIDTH, Math.max(1, Math.round(width)));
      const workH = Math.max(
        1,
        Math.round(workW * (sourceSize.height / sourceSize.width)),
      );

      heatmapTextureRef.current = buildHeatmapOverlay(centers, workW, workH);
      drawOverlay();
    }, [centers, containerSize, drawOverlay, sourceSize]);

    return (
      <>
        <div
          ref={containerRef}
          aria-hidden={!visible}
          className={`
            pointer-events-none absolute inset-0 size-full transition-opacity
            duration-500 ease-in-out
            motion-reduce:transition-none
            ${visible ? 'opacity-100' : 'opacity-0'}
          `}
        >
          <canvas
            ref={overlayCanvasRef}
            className="absolute inset-0 z-1 size-full"
          />
        </div>
        {visible && (
          <div
            className="
              pointer-events-auto absolute top-[calc(var(--mobile-hero-height)-2.75rem)]
              right-4 z-20 flex gap-2
            "
          >
            {leadingControl}
            <label className="relative hero-overlay-pill cursor-pointer">
              <span className="pointer-events-none">
                {selectedSpecies === 'all'
                  ? 'All Species'
                  : formatSpeciesName(selectedSpecies)}
              </span>
              <select
                value={selectedSpecies}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => onSelectedSpeciesChange(event.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
              >
                <option value="all">All Species</option>
                {speciesList.map((species) => (
                  <option key={species} value={species}>
                    {formatSpeciesName(species)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </>
    );
  },
);
