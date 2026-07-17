import { describe, expect, it } from 'vitest';
import {
  buildFishMotionScene,
  MAX_FISH_MOTION_SWIMMERS,
} from '../services/fishMotionScene';
import type { FishEntry } from '../../types/aquarium';

function fish(
  id: string,
  speciesId: string,
  count: number,
): FishEntry {
  return {
    id,
    tankId: 'tank-1',
    speciesId,
    name: speciesId,
    imageUrl: '',
    count,
    detected: 0,
  };
}

describe('buildFishMotionScene', () => {
  it('allocates the capped scene proportionally after representing each species', () => {
    const scene = buildFishMotionScene([
      fish('guppies', 'guppy', 10),
      fish('angelfish', 'angelfish', 5),
      fish('cories', 'corydoras', 1),
    ]);

    const speciesCounts = scene.swimmers.reduce<Record<string, number>>((counts, swimmer) => {
      counts[swimmer.speciesId] = (counts[swimmer.speciesId] ?? 0) + 1;
      return counts;
    }, {});

    expect(scene.swimmers).toHaveLength(MAX_FISH_MOTION_SWIMMERS);
    expect(speciesCounts).toEqual({ guppy: 7, angelfish: 4, corydoras: 1 });
    expect(scene.overflowCount).toBe(4);
    expect(scene.unsupportedCount).toBe(0);
  });

  it('uses catalog swim locations, lengths, and stable per-fish motion values', () => {
    const inventory = [
      fish('guppies', 'guppy', 2),
      fish('cories', 'corydoras', 1),
    ];

    const first = buildFishMotionScene(inventory);
    const second = buildFishMotionScene(inventory);

    expect(second).toEqual(first);
    expect(first.swimmers.find((swimmer) => swimmer.speciesId === 'guppy')?.lane)
      .toBe('middle');
    expect(first.swimmers.find((swimmer) => swimmer.speciesId === 'corydoras')?.lane)
      .toBe('bottom');

    const guppies = first.swimmers.filter((swimmer) => swimmer.speciesId === 'guppy');
    expect(guppies[0].motion).not.toEqual(guppies[1].motion);
    expect(guppies.map((swimmer) => swimmer.lengthCm)).toEqual([6, 6]);
    expect(first.swimmers.find((swimmer) => swimmer.speciesId === 'corydoras')?.lengthCm)
      .toBe(7.5);

    for (const swimmer of first.swimmers) {
      expect(swimmer.motion.cruiseSpeed).toBeGreaterThanOrEqual(7);
      expect(swimmer.motion.cruiseSpeed).toBeLessThanOrEqual(12);
      expect(swimmer.motion.pathSeed).toBeGreaterThanOrEqual(0);
      expect(swimmer.motion.pathSeed).toBeLessThan(1000);
      expect(swimmer.motion.timelineOffset).toBeGreaterThanOrEqual(0);
      expect(swimmer.motion.timelineOffset).toBeLessThan(1);
      expect(swimmer.motion.verticalSpan).toBeGreaterThanOrEqual(0.18);
      expect(swimmer.motion.verticalSpan).toBeLessThanOrEqual(0.28);
      expect(swimmer.motion.reversalInterval).toBeGreaterThanOrEqual(5);
      expect(swimmer.motion.reversalInterval).toBeLessThanOrEqual(8);
      expect(swimmer.motion.reversalOffset).toBeGreaterThanOrEqual(0);
      expect(swimmer.motion.reversalOffset).toBeLessThan(
        swimmer.motion.reversalInterval,
      );
    }
  });

  it('counts catalog photos and custom species as unsupported without using them', () => {
    const scene = buildFishMotionScene([
      fish('photo', 'adolfos_cory', 2),
      fish('custom', 'moonlight_minnow', 3),
      fish('supported', 'neon_tetra', 1),
    ]);

    expect(scene.swimmers).toHaveLength(1);
    expect(scene.swimmers[0].speciesId).toBe('neon_tetra');
    expect(scene.unsupportedCount).toBe(5);
    expect(scene.overflowCount).toBe(0);
  });

  it('handles a zero cap without losing supported inventory totals', () => {
    const scene = buildFishMotionScene([fish('guppies', 'guppy', 4)], 0);

    expect(scene.swimmers).toHaveLength(0);
    expect(scene.overflowCount).toBe(4);
  });
});
