import { describe, it, expect } from 'vitest';
import {
  intersectRanges,
  formatRange,
  analyzeFishTank,
} from '../services/speciesService';
import type { FishEntry } from '../../types/aquarium';

describe('speciesService', () => {
  describe('intersectRanges', () => {
    it('returns the intersection of overlapping ranges', () => {
      const result = intersectRanges([
        { min: 18, max: 28 },
        { min: 24, max: 30 },
      ]);
      expect(result.range).toEqual([24, 28]);
      expect(result.conflict).toBe(false);
    });

    it('returns null for an empty list', () => {
      const result = intersectRanges([]);
      expect(result.range).toBeNull();
      expect(result.conflict).toBe(false);
    });

    it('flags a conflict when ranges do not overlap', () => {
      const result = intersectRanges([
        { min: 20, max: 22 },
        { min: 26, max: 28 },
      ]);
      expect(result.conflict).toBe(true);
      expect(result.range).toEqual([20, 28]);
    });
  });

  describe('formatRange', () => {
    it('formats a range with unit', () => {
      expect(formatRange(24, 28, '°C')).toBe('24–28 °C');
    });

    it('formats a single value', () => {
      expect(formatRange(7, 7, '', 1)).toBe('7.0');
    });
  });

  describe('analyzeFishTank', () => {
    const fishList: FishEntry[] = [
      {
        id: 'f1',
        tankId: 'tank-demo',
        speciesId: 'guppy',
        name: 'Guppy',
        imageUrl: '',
        count: 5,
        detected: 3,
      },
      {
        id: 'f2',
        tankId: 'tank-demo',
        speciesId: 'angelfish',
        name: 'Angelfish',
        imageUrl: '',
        count: 2,
        detected: 2,
      },
    ];

    it('returns zero stats for an empty tank', () => {
      const analysis = analyzeFishTank([]);
      expect(analysis.stats.totalFish).toBe(0);
      expect(analysis.stats.uniqueSpecies).toBe(0);
      expect(analysis.stats.idealTankSizeL).toBeNull();
      expect(analysis.speciesDistribution).toEqual([]);
    });

    it('computes totals and species distribution', () => {
      const analysis = analyzeFishTank(fishList);
      expect(analysis.stats.totalFish).toBe(7);
      expect(analysis.stats.totalExpected).toBe(7);
      expect(analysis.stats.totalDetected).toBe(5);
      expect(analysis.stats.uniqueSpecies).toBe(2);
      expect(analysis.speciesDistribution).toHaveLength(2);
      expect(analysis.speciesDistribution[0].count).toBe(5);
      expect(analysis.speciesDistribution[1].count).toBe(2);
    });

    it('computes ideal parameters from species catalog', () => {
      const analysis = analyzeFishTank(fishList);
      expect(analysis.stats.idealTankSizeL).toBe(115);
      expect(analysis.stats.tempResult.range).toEqual([24, 28]);
      expect(analysis.stats.phResult.range).toEqual([6.8, 7.5]);
      expect(analysis.stats.tempResult.conflict).toBe(false);
      expect(analysis.stats.phResult.conflict).toBe(false);
    });
  });
});
