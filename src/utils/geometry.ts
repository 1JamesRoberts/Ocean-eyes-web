// src/utils/geometry.ts - Geometric helpers for detection analytics
import type { AIDetection } from '../types/aquarium';

interface Point {
  x: number;
  y: number;
}

interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Derive the center point of a detection from its normalized bounding box.
 * bbox_normalized order: [nx1, ny1, nx2, ny2]
 */
function getNormalizedCenter(bboxNormalized: [number, number, number, number]): Point {
  const [nx1, ny1, nx2, ny2] = bboxNormalized;
  return {
    x: (nx1 + nx2) / 2,
    y: (ny1 + ny2) / 2,
  };
}

/**
 * Euclidean distance between two points.
 * When image dimensions are provided, the x-axis displacement is scaled by
 * width/height so horizontal and vertical distances share the same physical
 * ratio. This avoids distorting distances on non-square frames (e.g. 1920x1080).
 */
function distance(a: Point, b: Point, imageDimensions?: ImageDimensions): number {
  const aspectRatio = imageDimensions && imageDimensions.height > 0
    ? imageDimensions.width / imageDimensions.height
    : 1;
  const dx = (a.x - b.x) * aspectRatio;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Compute the mean nearest-neighbor distance (NND) across all detections.
 *
 * For each detection, find the minimum distance to any other detection in the
 * same frame, then return the mean of those minima. Frames with fewer than 2
 * detections return 0 because NND is undefined.
 */
export function calculateMeanNND(
  detections: AIDetection[],
  imageDimensions?: ImageDimensions,
): number {
  if (detections.length < 2) {
    return 0;
  }

  const centers = detections.map((d) => getNormalizedCenter(d.bbox_normalized));

  let totalNND = 0;
  for (let i = 0; i < centers.length; i += 1) {
    let minDistance = Infinity;
    for (let j = 0; j < centers.length; j += 1) {
      if (i === j) continue;
      const d = distance(centers[i], centers[j], imageDimensions);
      if (d < minDistance) {
        minDistance = d;
      }
    }
    totalNND += minDistance;
  }

  return totalNND / centers.length;
}
