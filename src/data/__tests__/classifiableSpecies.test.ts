import { describe, expect, it } from 'vitest';
import {
  CLASSIFIABLE_SPECIES,
  resolveClassifiableSpeciesId,
} from '../classifiableSpecies';
import { SPECIES_CLASSES } from '../../models/inference/modelConfig';

describe('classifiable species projection', () => {
  it('contains one catalog-backed entry for every model class', () => {
    expect(CLASSIFIABLE_SPECIES).toHaveLength(SPECIES_CLASSES.length);
    expect(CLASSIFIABLE_SPECIES.map((species) => species.id)).toEqual([...SPECIES_CLASSES]);
    expect(new Set(CLASSIFIABLE_SPECIES.map((species) => species.id)).size)
      .toBe(SPECIES_CLASSES.length);
  });

  it('resolves the Black Skirt Tetra catalog alias and legacy IDs', () => {
    expect(CLASSIFIABLE_SPECIES.find((species) => species.id === 'black_skirt_tetra'))
      .toMatchObject({
        catalogId: 'black_widow_tetra',
        displayName: 'Black Skirt Tetra',
      });
    expect(resolveClassifiableSpeciesId('black_widow_tetra')).toBe('black_skirt_tetra');
    expect(resolveClassifiableSpeciesId('common_pleco')).toBe('plecostomus');
  });
});
