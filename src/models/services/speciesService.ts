// speciesService.ts - Pure fish species statistics and compatibility logic
import type { FishEntry } from '../../types/aquarium';
import {
  getSpeciesById,
  getSpeciesColor,
  getSpeciesInitials,
  checkTankCompatibility,
  getCompatibilityLevel,
  getCompatibilityColor,
  getOverallCompatibilityScore,
  type SpeciesInfo,
} from '../../data/speciesCatalog';

export interface RangeResult {
  range: [number, number] | null;
  conflict: boolean;
}

export function intersectRanges(
  ranges: Array<{ min: number; max: number }>
): RangeResult {
  if (ranges.length === 0) return { range: null, conflict: false };

  let low = -Infinity;
  let high = Infinity;

  for (const r of ranges) {
    low = Math.max(low, r.min);
    high = Math.min(high, r.max);
  }

  if (low <= high) {
    return { range: [low, high], conflict: false };
  }

  const allMins = ranges.map((r) => r.min);
  const allMaxs = ranges.map((r) => r.max);
  return { range: [Math.min(...allMins), Math.max(...allMaxs)], conflict: true };
}

export function formatRange(
  min: number,
  max: number,
  unit: string,
  decimals?: number
): string {
  const d = decimals ?? (Number.isInteger(min) && Number.isInteger(max) ? 0 : 1);
  const fmt = (v: number) => (d === 0 ? v.toString() : v.toFixed(d));
  if (min === max) return `${fmt(min)}${unit ? ` ${unit}` : ''}`;
  return `${fmt(min)}\u2013${fmt(max)} ${unit}`;
}

export interface SpeciesDistributionItem {
  name: string;
  count: number;
  color: string;
  initials: string;
}

export interface FishTankStats {
  totalFish: number;
  uniqueSpecies: number;
  idealTankSizeL: number | null;
  tempResult: RangeResult;
  phResult: RangeResult;
  totalDetected: number;
  totalExpected: number;
  overallCompatibility: number;
}

export interface FishTankAnalysis {
  stats: FishTankStats;
  speciesDistribution: SpeciesDistributionItem[];
}

export function analyzeFishTank(fishList: FishEntry[]): FishTankAnalysis {
  const totalFish = fishList.reduce((sum, f) => sum + f.count, 0);
  const uniqueSpecies = new Set(fishList.map((f) => f.speciesId)).size;

  const speciesData = fishList
    .map((f) => getSpeciesById(f.speciesId))
    .filter((s): s is SpeciesInfo => !!s);

  const tankSizes = speciesData
    .map((s) => s.minTankSizeL)
    .filter((v): v is number => v !== undefined);
  const idealTankSizeL = tankSizes.length > 0 ? Math.max(...tankSizes) : null;

  const tempRanges = speciesData
    .filter((s) => s.tempMin !== undefined && s.tempMax !== undefined)
    .map((s) => ({ min: s.tempMin!, max: s.tempMax! }));
  const tempResult = intersectRanges(tempRanges);

  const phRanges = speciesData
    .filter((s) => s.phMin !== undefined && s.phMax !== undefined)
    .map((s) => ({ min: s.phMin!, max: s.phMax! }));
  const phResult = intersectRanges(phRanges);

  const dist: Record<string, SpeciesDistributionItem> = {};
  fishList.forEach((fish) => {
    const species = getSpeciesById(fish.speciesId);
    const name = species ? species.displayName : fish.name;
    const color = species ? species.color : getSpeciesColor(fish.speciesId);
    const initials = species ? species.initials : getSpeciesInitials(fish.speciesId);
    if (dist[fish.speciesId]) {
      dist[fish.speciesId].count += fish.count;
    } else {
      dist[fish.speciesId] = { name, count: fish.count, color, initials };
    }
  });

  const totalDetected = fishList.reduce((sum, f) => sum + f.detected, 0);
  const totalExpected = totalFish;
  const overallCompatibility = getOverallCompatibilityScore(speciesData);

  return {
    stats: {
      totalFish,
      uniqueSpecies,
      idealTankSizeL,
      tempResult,
      phResult,
      totalDetected,
      totalExpected,
      overallCompatibility,
    },
    speciesDistribution: Object.values(dist).sort((a, b) => b.count - a.count),
  };
}

export {
  checkTankCompatibility,
  getCompatibilityLevel,
  getCompatibilityColor,
  getOverallCompatibilityScore,
};
