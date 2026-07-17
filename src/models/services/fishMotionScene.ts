import { getSpeciesById } from '../../data/speciesCatalog';
import type { FishEntry, SwimLocation } from '../../types/aquarium';

export const MAX_FISH_MOTION_SWIMMERS = 12;

export interface FishMotionProfile {
  pathSeed: number;
  initialDirection: -1 | 1;
  cruiseSpeed: number;
  timelineOffset: number;
  verticalSpan: number;
  reversalInterval: number;
  reversalOffset: number;
}

export interface FishMotionSprite {
  key: string;
  speciesId: string;
  imagePath: string;
  lane: SwimLocation;
  motion: FishMotionProfile;
  lengthCm: number;
  bodyPhase: number;
  depth: number;
}

export interface FishMotionScene {
  swimmers: readonly FishMotionSprite[];
  overflowCount: number;
  unsupportedCount: number;
}

interface SupportedInventoryEntry {
  fish: FishEntry;
  count: number;
  imagePath: string;
  lane: SwimLocation;
  lengthCm: number;
  allocated: number;
  index: number;
}

function isCuratedMotionAsset(imagePath: string): boolean {
  return imagePath.startsWith('/fish_crops/normalized/') && imagePath.endsWith('.png');
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function unitFromSeed(seed: number, salt: number): number {
  let value = (seed + Math.imul(salt, 0x9e3779b1)) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x21f0aaad);
  value ^= value >>> 15;
  value = Math.imul(value, 0x735a2d97);
  value ^= value >>> 15;
  return (value >>> 0) / 4294967296;
}

function allocateRemainingSlots(
  entries: SupportedInventoryEntry[],
  remainingSlots: number,
): void {
  const remainingCounts = entries.map((entry) => Math.max(0, entry.count - entry.allocated));
  const remainingTotal = remainingCounts.reduce((sum, count) => sum + count, 0);
  if (remainingSlots <= 0 || remainingTotal <= 0) return;

  const shares = entries.map((entry, index) => {
    const exact = (remainingSlots * remainingCounts[index]) / remainingTotal;
    const base = Math.min(remainingCounts[index], Math.floor(exact));
    entry.allocated += base;
    return { entry, fraction: exact - base };
  });

  let slotsLeft = remainingSlots - shares.reduce(
    (sum, share) => sum + Math.max(0, share.entry.allocated - 1),
    0,
  );

  shares.sort((a, b) => b.fraction - a.fraction || a.entry.index - b.entry.index);
  while (slotsLeft > 0) {
    let allocatedInPass = false;
    for (const share of shares) {
      if (slotsLeft === 0) break;
      if (share.entry.allocated >= share.entry.count) continue;
      share.entry.allocated += 1;
      slotsLeft -= 1;
      allocatedInPass = true;
    }
    if (!allocatedInPass) break;
  }
}

function createSprite(entry: SupportedInventoryEntry, ordinal: number): FishMotionSprite {
  const seed = hashString(`${entry.fish.id}:${entry.fish.speciesId}:${ordinal}`);
  const reversalInterval = 5 + Math.floor(unitFromSeed(seed, 8) * 4);
  return {
    key: `${entry.fish.id}:${ordinal}`,
    speciesId: entry.fish.speciesId,
    imagePath: entry.imagePath,
    lane: entry.lane,
    motion: {
      pathSeed: unitFromSeed(seed, 13) * 1000,
      initialDirection: unitFromSeed(seed, 1) < 0.5 ? -1 : 1,
      cruiseSpeed: 7 + unitFromSeed(seed, 2) * 5,
      timelineOffset: unitFromSeed(seed, 5),
      verticalSpan: 0.18 + unitFromSeed(seed, 10) * 0.1,
      reversalInterval,
      reversalOffset: Math.floor(unitFromSeed(seed, 9) * reversalInterval),
    },
    lengthCm: entry.lengthCm,
    bodyPhase: unitFromSeed(seed, 4) * Math.PI * 2,
    depth: unitFromSeed(seed, 7),
  };
}

export function buildFishMotionScene(
  fishList: readonly FishEntry[],
  maxSwimmers = MAX_FISH_MOTION_SWIMMERS,
): FishMotionScene {
  const limit = Math.max(0, Math.floor(maxSwimmers));
  const supported: SupportedInventoryEntry[] = [];
  let unsupportedCount = 0;

  fishList.forEach((fish, index) => {
    const count = Math.max(0, Math.floor(fish.count));
    if (count === 0) return;

    const species = getSpeciesById(fish.speciesId);
    if (!species || !isCuratedMotionAsset(species.imagePath)) {
      unsupportedCount += count;
      return;
    }

    supported.push({
      fish,
      count,
      imagePath: species.imagePath,
      lane: species.swimLocation ?? 'middle',
      lengthCm: species.sizeCm ?? 10,
      allocated: 0,
      index,
    });
  });

  let remainingSlots = limit;
  for (const entry of supported) {
    if (remainingSlots === 0) break;
    entry.allocated = 1;
    remainingSlots -= 1;
  }

  allocateRemainingSlots(supported, remainingSlots);

  const swimmers = supported.flatMap((entry) =>
    Array.from({ length: entry.allocated }, (_, ordinal) => createSprite(entry, ordinal)),
  );
  const supportedCount = supported.reduce((sum, entry) => sum + entry.count, 0);

  return {
    swimmers,
    overflowCount: Math.max(0, supportedCount - swimmers.length),
    unsupportedCount,
  };
}
