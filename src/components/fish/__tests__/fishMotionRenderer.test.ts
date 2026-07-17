import { describe, expect, it } from 'vitest';
import {
  calculateEdgeAlpha,
  calculateFishBodyDimensions,
  calculateFishMotionPoint,
  calculateSwimPose,
  SWIM_SPEED_MULTIPLIER,
} from '../fishMotionRenderer';
import type { FishMotionSprite } from '../../../models/services/fishMotionScene';

const viewport = { width: 100, height: 100 };
const bodyWidth = 20;
const bodyHeight = 20;

function swimmer(
  overrides: Partial<FishMotionSprite['motion']> = {},
  lane: FishMotionSprite['lane'] = 'middle',
): Pick<FishMotionSprite, 'lane' | 'motion'> {
  return {
    lane,
    motion: {
      pathSeed: 127.5,
      initialDirection: 1,
      cruiseSpeed: 10,
      timelineOffset: 0,
      verticalSpan: 0.24,
      reversalInterval: 7,
      reversalOffset: 0,
      ...overrides,
    },
  };
}

function crossingDuration(
  sprite: Pick<FishMotionSprite, 'motion'>,
  targetViewport = viewport,
  renderedBodyWidth = bodyWidth,
): number {
  return (targetViewport.width + renderedBodyWidth * 0.62 * 2)
    / (sprite.motion.cruiseSpeed * SWIM_SPEED_MULTIPLIER);
}

function findNextEntryTime(
  sprite: Pick<FishMotionSprite, 'lane' | 'motion'>,
  afterSeconds: number,
): number {
  for (let time = afterSeconds + 0.01; time <= afterSeconds + 4.1; time += 0.01) {
    const pose = calculateSwimPose(sprite, time, viewport, bodyWidth, bodyHeight);
    if (pose.x < 0) return time;
  }
  throw new Error('Expected the next left-edge entry within the maximum gap');
}

describe('fishMotionRenderer math', () => {
  it('matches the reference deformation field at fixed inputs', () => {
    expect(calculateFishMotionPoint(-1.25, 17)).toEqual({
      x: expect.closeTo(-1.8267326821, 8),
      y: expect.closeTo(0.1129347811, 8),
      depth: expect.closeTo(0.2566292948, 8),
    });
    expect(calculateFishMotionPoint(-0.2, 120)).toEqual({
      x: expect.closeTo(-1.4288495836, 8),
      y: expect.closeTo(-1.6180907495, 8),
      depth: expect.closeTo(0.0727954722, 8),
    });
  });

  it('scales fish from catalog length around the responsive ten-centimeter baseline', () => {
    const mobileViewport = { width: 393, height: 221 };
    const wideViewport = { width: 768, height: 432 };

    for (const targetViewport of [mobileViewport, wideViewport]) {
      const baseline = calculateFishBodyDimensions(targetViewport, 10);
      const shortFish = calculateFishBodyDimensions(targetViewport, 2.5);
      const longFish = calculateFishBodyDimensions(targetViewport, 40);

      expect(baseline.width).toBeCloseTo(targetViewport.width === 393 ? 66.81 : 74);
      expect(baseline.height).toBeCloseTo(baseline.width * 0.78);
      expect(shortFish.width).toBeCloseTo(baseline.width * 0.5);
      expect(longFish.width).toBeCloseTo(baseline.width * 2);
    }
  });

  it('keeps length sizing monotonic and falls back to ten centimeters', () => {
    const widths = [2.5, 5, 10, 20, 40].map(
      (lengthCm) => calculateFishBodyDimensions(viewport, lengthCm).width,
    );

    for (let index = 1; index < widths.length; index += 1) {
      expect(widths[index]).toBeGreaterThan(widths[index - 1]);
    }

    const baseline = calculateFishBodyDimensions(viewport, 10);
    for (const invalidLength of [undefined, 0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(calculateFishBodyDimensions(viewport, invalidLength)).toEqual(baseline);
    }
  });

  it('passes fully beyond both edges and wraps with the same facing', () => {
    const sprite = swimmer({ reversalInterval: 8 });
    const duration = crossingDuration(sprite);
    const start = calculateSwimPose(sprite, 0, viewport, bodyWidth, bodyHeight);
    const exit = calculateSwimPose(sprite, duration, viewport, bodyWidth, bodyHeight);
    const nextEntryTime = findNextEntryTime(sprite, duration);
    const nextEntry = calculateSwimPose(
      sprite,
      nextEntryTime,
      viewport,
      bodyWidth,
      bodyHeight,
    );

    expect(start.x).toBeCloseTo(-12.4);
    expect(exit.x).toBeCloseTo(112.4);
    expect(calculateEdgeAlpha(start.x, viewport.width, bodyWidth / 2)).toBe(0);
    expect(calculateEdgeAlpha(exit.x, viewport.width, bodyWidth / 2)).toBe(0);
    expect(nextEntry.x).toBeLessThan(0);
    expect(nextEntry.facingScale).toBe(1);
    expect(nextEntry.pitch).toBeGreaterThanOrEqual(-Math.PI / 15);
    expect(nextEntry.pitch).toBeLessThanOrEqual(Math.PI / 15);
  });

  it('changes direction only at infrequent, fully hidden leg boundaries', () => {
    const sprite = swimmer({ reversalInterval: 7, reversalOffset: 0 });
    const duration = crossingDuration(sprite);
    const maximumTimeline = (duration + 4) * 24;
    let previous = calculateSwimPose(sprite, 0, viewport, bodyWidth, bodyHeight);
    let reversalCount = 0;

    for (let time = 0.05; time <= maximumTimeline; time += 0.05) {
      const current = calculateSwimPose(sprite, time, viewport, bodyWidth, bodyHeight);
      if (current.facingScale !== previous.facingScale) {
        reversalCount += 1;
        expect(calculateEdgeAlpha(previous.x, viewport.width, bodyWidth / 2)).toBe(0);
        expect(calculateEdgeAlpha(current.x, viewport.width, bodyWidth / 2)).toBe(0);
      }
      previous = current;
    }

    expect(reversalCount).toBeGreaterThanOrEqual(3);
    expect(reversalCount).toBeLessThanOrEqual(4);
  });

  it('uses fresh deterministic active routes and caps tangent pitch', () => {
    const sprite = swimmer({ verticalSpan: 0.24 });
    const duration = crossingDuration(sprite);
    const nextEntryTime = findNextEntryTime(sprite, duration);
    const firstRoute: number[] = [];
    const secondRoute: number[] = [];
    let minimumY = Number.POSITIVE_INFINITY;
    let maximumY = Number.NEGATIVE_INFINITY;
    let maximumPitch = 0;

    for (let index = 0; index <= 1200; index += 1) {
      const time = duration * index / 1200;
      const pose = calculateSwimPose(sprite, time, viewport, bodyWidth, bodyHeight);
      minimumY = Math.min(minimumY, pose.y);
      maximumY = Math.max(maximumY, pose.y);
      maximumPitch = Math.max(maximumPitch, Math.abs(pose.pitch));
    }

    for (const progress of [0.2, 0.4, 0.6, 0.8]) {
      firstRoute.push(calculateSwimPose(
        sprite,
        duration * progress,
        viewport,
        bodyWidth,
        bodyHeight,
      ).y);
      secondRoute.push(calculateSwimPose(
        sprite,
        nextEntryTime + duration * progress,
        viewport,
        bodyWidth,
        bodyHeight,
      ).y);
    }

    expect(maximumY - minimumY).toBeGreaterThan(23.8);
    expect(maximumPitch).toBeGreaterThan(0.05);
    expect(maximumPitch).toBeLessThanOrEqual(Math.PI / 15);
    expect(secondRoute).not.toEqual(firstRoute);
    expect(calculateSwimPose(sprite, 4, viewport, bodyWidth, bodyHeight))
      .toEqual(calculateSwimPose(sprite, 4, viewport, bodyWidth, bodyHeight));
  });

  it('keeps paced progress monotonic and within fifteen percent of cruise speed', () => {
    const sprite = swimmer();
    const duration = crossingDuration(sprite);
    const sampleCount = 400;
    const stepSeconds = duration / sampleCount;
    const speeds: number[] = [];
    let previous = calculateSwimPose(sprite, 0, viewport, bodyWidth, bodyHeight);

    for (let index = 1; index <= sampleCount; index += 1) {
      const current = calculateSwimPose(
        sprite,
        stepSeconds * index,
        viewport,
        bodyWidth,
        bodyHeight,
      );
      expect(current.x).toBeGreaterThanOrEqual(previous.x);
      speeds.push((current.x - previous.x) / stepSeconds);
      previous = current;
    }

    expect(Math.min(...speeds)).toBeGreaterThanOrEqual(16.99);
    expect(Math.max(...speeds)).toBeLessThanOrEqual(23.01);
    expect(previous.x).toBeCloseTo(112.4);
  });

  it('keeps curved routes within swim bands at mobile and wide sizes', () => {
    const targetViewports = [
      { width: 393, height: 221 },
      { width: 768, height: 432 },
    ];
    const laneBands = {
      top: [0.14, 0.5],
      middle: [0.28, 0.72],
      bottom: [0.5, 0.86],
    } as const;

    for (const targetViewport of targetViewports) {
      for (const [index, lane] of (['top', 'middle', 'bottom'] as const).entries()) {
        const lengthCm = [2.5, 10, 40][index];
        const {
          width: renderedBodyWidth,
          height: renderedBodyHeight,
        } = calculateFishBodyDimensions(targetViewport, lengthCm);
        const horizontalInset = renderedBodyWidth * 0.62;
        const verticalInset = renderedBodyHeight / 2 + renderedBodyWidth * 0.12;
        const laneTop = Math.max(targetViewport.height * laneBands[lane][0], verticalInset);
        const laneBottom = Math.min(
          targetViewport.height * laneBands[lane][1],
          targetViewport.height - verticalInset,
        );
        const sprite = swimmer({
          pathSeed: 70 + index * 113,
          timelineOffset: index * 0.21,
          verticalSpan: 0.18 + index * 0.05,
          reversalInterval: 5 + index,
          reversalOffset: index,
        }, lane);

        for (let elapsedSeconds = 0; elapsedSeconds <= 240; elapsedSeconds += 0.5) {
          const pose = calculateSwimPose(
            sprite,
            elapsedSeconds,
            targetViewport,
            renderedBodyWidth,
            renderedBodyHeight,
          );
          expect(pose.x).toBeGreaterThanOrEqual(-horizontalInset - 0.000001);
          expect(pose.x).toBeLessThanOrEqual(targetViewport.width + horizontalInset + 0.000001);
          expect(pose.y).toBeGreaterThanOrEqual(laneTop - 0.000001);
          expect(pose.y).toBeLessThanOrEqual(laneBottom + 0.000001);
          expect(Math.abs(pose.pitch)).toBeLessThanOrEqual(Math.PI / 15);
        }
      }
    }
  });

  it('softly fades fish at both scene edges', () => {
    expect(calculateEdgeAlpha(-25, 100, 25)).toBe(0);
    expect(calculateEdgeAlpha(14, 100, 25)).toBe(1);
    expect(calculateEdgeAlpha(50, 100, 25)).toBe(1);
    expect(calculateEdgeAlpha(125, 100, 25)).toBe(0);
  });
});
