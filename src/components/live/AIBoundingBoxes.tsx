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

function getCoverOffsets(
  imgWidth: number,
  imgHeight: number,
  containerWidth: number,
  containerHeight: number
) {
  const imgRatio = imgWidth / imgHeight;
  const containerRatio = containerWidth / containerHeight;

  let renderedWidth: number;
  let renderedHeight: number;
  let offsetX: number;
  let offsetY: number;

  if (containerRatio > imgRatio) {
    renderedWidth = containerWidth;
    renderedHeight = containerWidth / imgRatio;
    offsetX = 0;
    offsetY = (containerHeight - renderedHeight) / 2;
  } else {
    renderedHeight = containerHeight;
    renderedWidth = containerHeight * imgRatio;
    offsetX = (containerWidth - renderedWidth) / 2;
    offsetY = 0;
  }

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
  const { renderedWidth, renderedHeight, offsetX, offsetY } = getCoverOffsets(iw, ih, cw, ch);

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

        return (
          <div key={idx} style={{
            position: 'absolute',
            left: `${left}px`,
            top: `${top}px`,
            width: `${width}px`,
            height: `${height}px`,
            border: `2px solid ${boxColor}`,
            borderRadius: '4px',
            boxShadow: `0 0 8px ${boxColor}40`
          }}>
            <div style={{
              position: 'absolute',
              top: '-22px',
              left: 0,
              backgroundColor: boxColor,
              color: '#FFF',
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '4px',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span>{det.species_display}</span>
              <span style={{ opacity: 0.8 }}>
                {(det.confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
