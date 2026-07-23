// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import {
  addFish,
  getFish,
  STORAGE_KEYS,
} from '../storageBase';

const tankId = 'test-classifier-id';

afterEach(() => {
  localStorage.removeItem(STORAGE_KEYS.fish(tankId));
});

describe('fish repository', () => {
  it('persists an explicit classifier ID for model-backed entries', () => {
    addFish(tankId, 'Plecostomus', '/fish.png', 1, 'plecostomus');
    addFish(tankId, 'Plecostomus', '/fish.png', 1, 'plecostomus');

    expect(getFish(tankId)).toEqual([
      expect.objectContaining({
        speciesId: 'plecostomus',
        count: 2,
      }),
    ]);
  });
});
