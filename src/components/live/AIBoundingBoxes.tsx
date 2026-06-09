import React from 'react';
import { getSpeciesById } from '../../data/speciesCatalog';
import type { AIDetectionResult } from '../../types/aquarium';

interface AIBoundingBoxesProps {
  lastPrediction: AIDetectionResult;
  containerSize: { width: number; height: number };
  imageNaturalSize: { width: number; height: number };
  panOffset: { x: number; y: number };
  zoomLevel: number;
  isDragging: boolean;
}

function getWidthAutoRenderInfo(
  imgWidth: number,
  imgHeight: number,
  containerWidth: number,
  _containerHeight: number
) {
  // Models the actual DOM rendering: img { width: 100%; height: auto; }
  const renderedWidth = containerWidth;
  const renderedHeight = containerWidth * (imgHeight / imgWidth);
  const offsetX = 0;
  const offsetY = 0;
  return { renderedWidth, renderedHeight, offsetX, offsetY };
}

export const AIBoundingBoxes: React.FC<AIBoundingBoxesProps> = ({
  lastPrediction,
  containerSize,
  imageNaturalSize,
  panOffset,
  zoomLevel,
  isDragging
}) => {
  const cw = containerSize.width;
  const ch = containerSize.height;
  const iw = imageNaturalSize.width || lastPrediction.image_dimensions.width || cw;
  const ih = imageNaturalSize.height || lastPrediction.image_dimensions.height || ch;
  const { renderedWidth, renderedHeight, offsetX, offsetY } = getWidthAutoRenderInfo(iw, ih, cw, ch);

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 15,
      pointerEvents: 'none',
      transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
      transformOrigin: 'center',
      transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    }}>
      {lastPrediction.detections.map((det, idx) => {
        const [nx1, ny1, nx2, ny2] = det.bbox_normalized;
        const speciesInfo = getSpeciesById(det.species);
        const boxColor = speciesInfo?.color || '#3B82F6';

        const left = offsetX + nx1 * renderedWidth;
        const top = offsetY + ny1 * renderedHeight;
        const width = (nx2 - nx1) * renderedWidth;
        const height = (ny2 - ny1) * renderedHeight;

        const fontSize = Math.max(10, Math.min(22, width * 0.12));
        return (
          <div key={idx} style={{
            position: 'absolute',
            left: `${left}px`,
            top: `${top}px`,
            width: `${width}px`,
            height: `${height}px`,
            border: `2px solid ${boxColor}`,
            boxShadow: `0 0 8px ${boxColor}40`
          }}>
            <span style={{
              position: 'absolute',
              top: `-${fontSize + 4}px`,
              left: '2px',
              fontSize: `${fontSize}px`,
              fontWeight: 400,
              color: boxColor,
              textShadow: '0 1px 2px rgba(0,0,0,0.6)',
              whiteSpace: 'nowrap',
              opacity: 0.85,
              pointerEvents: 'none'
            }}>
              {det.species_display} {(det.confidence * 100).toFixed(0)}%
            </span>
          </div>
        );
      })}
    </div>
  );
};
