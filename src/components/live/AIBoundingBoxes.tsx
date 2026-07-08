import React from 'react';
import { getSpeciesById } from '../../data/speciesCatalog';
import type { AIDetectionResult } from '../../types/aquarium';

interface AIBoundingBoxesProps {
  lastPrediction: AIDetectionResult;
  containerSize: { width: number; height: number };
  imageNaturalSize: { width: number; height: number };
}

export const AIBoundingBoxes: React.FC<AIBoundingBoxesProps> = ({
  lastPrediction,
  containerSize,
  imageNaturalSize,
}) => {
  const cw = containerSize.width;
  const ch = containerSize.height;
  const dims = lastPrediction.image_dimensions;
  const iw = imageNaturalSize.width || dims?.width || cw || 1;
  const ih = imageNaturalSize.height || dims?.height || ch;

  const scaleX = cw / iw;
  const scaleY = ch / ih;
  const scale = Math.max(scaleX, scaleY);
  const displayedWidth = iw * scale;
  const displayedHeight = ih * scale;
  const offsetX = (cw - displayedWidth) / 2;
  const offsetY = (ch - displayedHeight) / 2;

  return (
    <div className="pointer-events-none absolute inset-0 z-15">
      {lastPrediction.detections.map((det, idx) => {
        const [nx1, ny1, nx2, ny2] = det.bbox_normalized;
        const speciesInfo = getSpeciesById(det.species);
        const boxColor = speciesInfo?.color || '#3B82F6';

        const left = offsetX + nx1 * displayedWidth;
        const top = offsetY + ny1 * displayedHeight;
        const width = (nx2 - nx1) * displayedWidth;
        const height = (ny2 - ny1) * displayedHeight;
        const diameter = Math.min(width, height);
        const circleLeft = left + (width - diameter) / 2;
        const circleTop = top + (height - diameter) / 2;
        const fontSize = Math.max(10, Math.min(22, diameter * 0.18));

        return (
          <div
            key={idx}
            className="pointer-events-none absolute"
            style={{
              left: `${circleLeft}px`,
              top: `${circleTop}px`,
              width: `${diameter}px`,
              height: `${diameter}px`,
              border: `2px solid ${boxColor}`,
              borderRadius: '50%',
              boxShadow: `0 0 12px ${boxColor}66, inset 0 0 6px ${boxColor}33`,
            }}
          >
            <span
              className="
                pointer-events-none absolute left-1/2 -translate-x-1/2
                whitespace-nowrap opacity-90 font-semibold
              "
              style={{
                top: `-${fontSize + 6}px`,
                fontSize: `${fontSize}px`,
                color: boxColor,
                textShadow: '0 1px 3px rgba(0,0,0,0.75)',
              }}
            >
              {det.species_display} {(det.confidence * 100).toFixed(0)}%
            </span>
          </div>
        );
      })}
    </div>
  );
};
