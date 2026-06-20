import { describe, it, expect } from 'vitest';
import {
  generateSimulatedChemistry,
  type ChemistryRng,
} from '../services/chemistryService';

describe('chemistryService', () => {
  it('returns chemistry within expected shape and ranges', () => {
    const chemistry = generateSimulatedChemistry();
    expect(chemistry).toHaveProperty('ph');
    expect(chemistry).toHaveProperty('temp');
    expect(chemistry).toHaveProperty('ammonia');
    expect(chemistry).toHaveProperty('nitrite');

    expect(chemistry.ph).toBeGreaterThanOrEqual(7.1);
    expect(chemistry.ph).toBeLessThanOrEqual(7.4);
    expect(chemistry.temp).toBeGreaterThanOrEqual(25.5);
    expect(chemistry.temp).toBeLessThanOrEqual(26.7);
    expect(chemistry.nitrite).toBeGreaterThanOrEqual(0.05);
    expect(chemistry.nitrite).toBeLessThanOrEqual(0.15);
    expect([0, 0.02]).toContain(chemistry.ammonia);
  });

  it('is deterministic with a seed', () => {
    const first = generateSimulatedChemistry(12345);
    const second = generateSimulatedChemistry(12345);
    expect(first).toEqual(second);
  });

  it('accepts a custom RNG', () => {
    const rng: ChemistryRng = {
      random: () => 0.5,
    };
    const chemistry = generateSimulatedChemistry(rng);
    expect(chemistry.ph).toBe(7.3);
    expect(chemistry.temp).toBe(26.1);
    expect(chemistry.ammonia).toBe(0);
    expect(chemistry.nitrite).toBe(0.1);
  });
});
