import { describe, expect, it } from 'vitest';
import { calculateObjectCoverRect } from '../heatmapOverlay';

describe('calculateObjectCoverRect', () => {
  it('center-crops a wide frame to match a taller video container', () => {
    const rect = calculateObjectCoverRect(640, 360, 393, 277);

    expect(rect.width).toBeCloseTo(492.44);
    expect(rect.height).toBe(277);
    expect(rect.offsetX).toBeCloseTo(-49.72);
    expect(rect.offsetY).toBe(0);
  });

  it('center-crops a tall frame to match a wider video container', () => {
    const rect = calculateObjectCoverRect(360, 640, 393, 221);

    expect(rect.width).toBeCloseTo(393);
    expect(rect.height).toBeCloseTo(698.67);
    expect(rect.offsetX).toBeCloseTo(0);
    expect(rect.offsetY).toBeCloseTo(-238.83);
  });
});
