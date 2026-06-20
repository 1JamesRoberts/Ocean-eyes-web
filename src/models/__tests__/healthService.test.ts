import { describe, it, expect } from 'vitest';
import {
  calculateHealthScore,
  getHealthColor,
  getHealthMessage,
} from '../services/healthService';

describe('healthService', () => {
  describe('calculateHealthScore', () => {
    it('returns a perfect score for ideal parameters', () => {
      expect(
        calculateHealthScore({ ph: 7.2, clarity: 0.5, ammonia: 0, nitrite: 0 })
      ).toBe(10);
    });

    it('penalises pH deviation', () => {
      const score = calculateHealthScore({ ph: 8.2, clarity: 0.5 });
      expect(score).toBeLessThan(10);
      expect(score).toBe(6);
    });

    it('penalises high clarity (turbidity)', () => {
      const score = calculateHealthScore({ clarity: 5 });
      expect(score).toBeLessThan(10);
    });

    it('penalises ammonia and nitrite', () => {
      const score = calculateHealthScore({
        clarity: 0.5,
        ammonia: 0.1,
        nitrite: 0.5,
      });
      expect(score).toBeLessThan(10);
    });

    it('clamps at the minimum score', () => {
      const score = calculateHealthScore({
        ph: 4,
        clarity: 100,
        ammonia: 10,
        nitrite: 10,
      });
      expect(score).toBe(1);
    });
  });

  describe('getHealthColor', () => {
    it('returns good color for high scores', () => {
      expect(getHealthColor(9)).toBe('var(--color-good)');
    });

    it('returns warning color for medium scores', () => {
      expect(getHealthColor(7)).toBe('var(--color-warning)');
    });

    it('returns critical color for low scores', () => {
      expect(getHealthColor(4)).toBe('var(--color-critical)');
    });
  });

  describe('getHealthMessage', () => {
    it('returns optimal message for high scores', () => {
      expect(getHealthMessage(8.5)).toContain('excellent');
    });

    it('returns caution message for medium scores', () => {
      expect(getHealthMessage(6.5)).toContain('Mild');
    });

    it('returns critical message for low scores', () => {
      expect(getHealthMessage(3)).toContain('Critical');
    });
  });
});
