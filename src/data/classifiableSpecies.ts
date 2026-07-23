import { displayClassName } from '../models/inference/inferenceMath';
import { SPECIES_CLASSES } from '../models/inference/modelConfig';
import {
  getSpeciesById,
  type SpeciesInfo,
} from './speciesCatalog';

export type ClassifiableSpeciesId = typeof SPECIES_CLASSES[number];

/**
 * Model class IDs are the canonical IDs used by AI results and new inventory
 * entries. Most classes have the same ID in the reference catalog; this map
 * records the catalog-only aliases that need to be resolved explicitly.
 */
const CATALOG_ID_BY_CLASSIFIABLE_ID: Partial<Record<ClassifiableSpeciesId, string>> = {
  black_skirt_tetra: 'black_widow_tetra',
};

const LEGACY_IDS_BY_CLASSIFIABLE_ID: Partial<Record<ClassifiableSpeciesId, readonly string[]>> = {
  black_skirt_tetra: ['black_widow_tetra'],
  otocinclus: ['golden_dwarf_sucker'],
  platy: ['southern_platy'],
  plecostomus: ['common_pleco'],
  swordtail: ['green_swordtail'],
};

export interface ClassifiableSpecies extends SpeciesInfo {
  classifierId: ClassifiableSpeciesId;
  catalogId: string;
  legacyIds: readonly string[];
}

const normalizeSpeciesId = (id: string): string =>
  id.toLowerCase().trim().replace(/-/g, '_');

export const CLASSIFIABLE_SPECIES: ClassifiableSpecies[] = SPECIES_CLASSES.map((classifierId) => {
  const catalogId = CATALOG_ID_BY_CLASSIFIABLE_ID[classifierId] ?? classifierId;
  const catalogSpecies = getSpeciesById(catalogId);

  if (!catalogSpecies) {
    throw new Error(`Missing catalog entry for AI species class: ${classifierId}`);
  }

  const displayName = displayClassName(classifierId);

  return {
    ...catalogSpecies,
    id: classifierId,
    name: displayName,
    displayName,
    classifierId,
    catalogId,
    legacyIds: LEGACY_IDS_BY_CLASSIFIABLE_ID[classifierId] ?? [],
  };
});

const CLASSIFIABLE_ID_BY_ALIAS = new Map<string, ClassifiableSpeciesId>(
  CLASSIFIABLE_SPECIES.flatMap((species) => [
    [normalizeSpeciesId(species.classifierId), species.classifierId],
    [normalizeSpeciesId(species.catalogId), species.classifierId],
    ...species.legacyIds.map((id) => [normalizeSpeciesId(id), species.classifierId] as const),
  ])
);

/** Resolve current and legacy inventory IDs to the AI classifier ID. */
export const resolveClassifiableSpeciesId = (id: string): string =>
  CLASSIFIABLE_ID_BY_ALIAS.get(normalizeSpeciesId(id)) ?? normalizeSpeciesId(id);
