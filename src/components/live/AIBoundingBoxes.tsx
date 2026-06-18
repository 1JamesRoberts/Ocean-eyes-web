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
  const iw = imageNaturalSize.width || dims?.width || cw;
  const ih = imageNaturalSize.height || dims?.height || ch;
  const renderedWidth = cw;
  const renderedHeight = cw * (ih / iw);

  return (
    <div className="pointer-events-none absolute inset-0 z-15">
      {lastPrediction.detections.map((det, idx) => {
        const [nx1, ny1, nx2, ny2] = det.bbox_normalized;
        const speciesInfo = getSpeciesById(det.species);
        const boxColor = speciesInfo?.color || '#3B82F6';

        const left = nx1 * renderedWidth;
        const top = ny1 * renderedHeight;
        const width = (nx2 - nx1) * renderedWidth;
        const height = (ny2 - ny1) * renderedHeight;

        const fontSize = Math.max(10, Math.min(22, width * 0.12));
        return (
          <div key={idx} className="absolute" style={{
            left: `${left}px`,
            top: `${top}px`,
            width: `${width}px`,
            height: `${height}px`,
            border: `2px solid ${boxColor}`,
            boxShadow: `0 0 8px ${boxColor}40`
          }}>
            <span className="
              pointer-events-none absolute left-[2px] whitespace-nowrap
              opacity-85
            " style={{
              top: `-${fontSize + 4}px`,
              fontSize: `${fontSize}px`,
              color: boxColor,
              textShadow: '0 1px 2px rgba(0,0,0,0.6)'
            }}>
              {det.species_display} {(det.confidence * 100).toFixed(0)}%
            </span>
          </div>
        );
      })}
    </div>
  );
};
