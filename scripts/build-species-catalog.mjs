/**
 * build-species-catalog.mjs
 *
 * Fetches fish_array.js from selectyourfish.com, maps all 541+ entries to
 * our TypeScript SpeciesInfo format, applies manual overrides for the original
 * 24 species (colors, initials, image paths), and regenerates
 * src/data/speciesCatalog.ts.
 *
 * Usage:  node scripts/build-species-catalog.mjs
 * After:   npm run build  (to verify TypeScript)
 */

// ── Imports ─────────────────────────────────────────────────────────────────
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SOURCE_URL = 'https://selectyourfish.com/prod/fish_array.js';
const OVERRIDES_PATH = path.join(__dirname, 'species-overrides.json');
const OUTPUT_PATH = path.join(ROOT, 'src', 'data', 'speciesCatalog.ts');
const IMAGE_DIR = path.join(ROOT, 'public', 'fish_crops');

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert an English name to a URL-safe snake_case slug */
function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .replace(/_+/g, '_');
}

/** Generate initials from a display name */
function toInitials(name) {
  return name
    .split(/[\s-]+/)
    .filter(w => w.length > 0 && !['the', 'and', 'of'].includes(w.toLowerCase()))
    .map(w => w[0].toUpperCase())
    .join('')
    .substring(0, 4);
}

/** Generate a deterministic vibrant HSL color from a string hash */
function nameToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = ((hash % 360) + 360) % 360;
  const sat = 60 + (Math.abs(hash >> 8) % 20);
  const light = 50 + (Math.abs(hash >> 4) % 20);
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

/** Parse a string to a number, returning 0 on invalid */
function parseNum(str) {
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

/** Download an image and save to disk */
async function downloadImage(url, destPath) {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(destPath, buffer);
    return true;
  } catch {
    return false;
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔍 Fetching species data from selectyourfish.com...');

  // 1. Fetch the source data
  const res = await fetch(SOURCE_URL);
  const sourceText = await res.text();

  // 2. Parse the JS object literal array
  const start = sourceText.indexOf('[');
  const end = sourceText.lastIndexOf(']');
  const raw = sourceText.substring(start, end + 1);
  const entries = new Function('return ' + raw + ';')();

  console.log(`📦 Found ${entries.length} entries in source.`);

  // 3. Load overrides
  const overrides = fs.existsSync(OVERRIDES_PATH)
    ? JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf8'))
    : {};
  console.log(`🎨 Loaded ${Object.keys(overrides).length} manual overrides.`);

  // Build a reverse lookup: source slug → override key, and fishId → override key
  const overrideBySlug = {}; // source slug -> override entry + desired key
  const overrideByFishId = {}; // source fish_id -> override entry + desired key
  for (const [desiredId, ov] of Object.entries(overrides)) {
    if (ov.matchName) {
      overrideBySlug[toSlug(ov.matchName)] = { ...ov, desiredId };
    }
    if (ov.matchFishId) {
      overrideByFishId[ov.matchFishId] = { ...ov, desiredId };
    }
  }

  // 4. Map each entry to our SpeciesInfo format
  const catalog = [];
  const seenSlugs = new Set();

  for (const f of entries) {
    const nameEnglish = (f.name_english || '').trim();
    if (!nameEnglish) continue;

    const slug = toSlug(nameEnglish);
    const fishId = String(f.fish_id).trim();

    // Check for overrides: first by fish_id, then by slug
    const matchFromFishId = overrideByFishId[fishId];
    const matchFromSlug = overrideBySlug[slug];
    const matchedOverride = matchFromFishId || matchFromSlug;

    let desiredSlug;
    let override;

    if (matchedOverride) {
      // Use the desired ID from the override key
      desiredSlug = matchedOverride.desiredId;
      override = matchedOverride;
      // Remove meta fields so they don't leak into the generated entry
      delete override.desiredId;
      delete override.matchName;
      delete override.matchFishId;
    } else {
      desiredSlug = slug;
      override = {};
    }

    // Avoid duplicate slugs
    let uniqueSlug = desiredSlug;
    if (seenSlugs.has(desiredSlug)) {
      uniqueSlug = `${desiredSlug}_${fishId}`;
    }
    seenSlugs.add(uniqueSlug);

    const initials = override.initials || toInitials(nameEnglish);
    const color = override.color || nameToColor(nameEnglish);
    const imagePath = override.imagePath || `/fish_crops/${desiredSlug}.webp`;

    const phMin = parseNum(f.phmin);
    const phMax = parseNum(f.phmax);
    const tempMin = parseNum(f.temperature_min);
    const tempMax = parseNum(f.temperature_max);
    const cmMax = parseNum(f.cm_max);
    const tankSize = parseNum(f.tank_size_liter);
    const uncare = f.uncare;
    const avail = f.availability;
    const school = f.school;
    const agression = f.agression;
    const swim = f.swim;
    const breed = f.breeding_difficulty;

    const detailArgs = [JSON.stringify(f.name_latin || ''), cmMax, tempMin, tempMax, phMin, phMax, tankSize,
      JSON.stringify(uncare || ''), JSON.stringify(avail || ''), JSON.stringify(school || ''),
      JSON.stringify(agression || ''), JSON.stringify(swim || ''), JSON.stringify(breed || ''),
      JSON.stringify((f.origin || '').replace(/,\s*$/, '')),
      JSON.stringify(f.region || '')];

    // Override displayName if provided
    const displayName = override.displayName || nameEnglish.charAt(0).toUpperCase() + nameEnglish.slice(1);
    const safeName = override.name || nameEnglish;

    catalog.push({
      slug: uniqueSlug,
      name: safeName,
      displayName,
      initials,
      color,
      imageClass: `species-${uniqueSlug}`,
      imagePath,
      detailArgs,
      extra: {
        altName: f.alt_name || undefined,
        family: f.family || undefined,
        fishId: f.fish_id || undefined,
        creatureType: f.isfish || undefined,
        hasExtendedInfo: f.more === '1' ? true : undefined,
      },
    });
  }

  // 5. Sort alphabetically by name
  catalog.sort((a, b) => a.name.localeCompare(b.name));

  console.log(`✅ Mapped ${catalog.length} species.`);

  // 6. Check that all overrides matched a source entry (warn if not)
  const matchedSlugs = new Set(catalog.map(c => c.slug));
  for (const slug of Object.keys(overrides)) {
    if (!matchedSlugs.has(slug)) {
      const ov = overrides[slug];
      console.warn(`⚠️  Override for "${slug}" (matchName="${ov.matchName || ''}", matchFishId="${ov.matchFishId || ''}") did not match any source entry.`);
    }
  }

  // 7. Generate the TypeScript file content
  let ts = `// AUTO-GENERATED by scripts/build-species-catalog.mjs — DO NOT EDIT MANUALLY
// Source: https://selectyourfish.com/prod/fish_array.js
// Generated: ${new Date().toISOString().split('T')[0]}
import type { SpeciesDetail, Difficulty, Availability, BehaviorType, Aggression, SwimLocation, BreedingDifficulty, Region, CreatureType } from '../types/aquarium';

export interface SpeciesInfo extends Partial<SpeciesDetail> {
  id: string;
  name: string;
  displayName: string;
  imageClass: string;
  imagePath: string;
  initials: string;
  color: string;
}

// ── Numeric field mapping from selectyourfish.com database ───────────────────
//   uncare (difficulty): 4=beginner, 3=easy, 2=medium, 1=difficult
//   availability: 4=very_common, 3=common, 2=rare, 1=very_rare
//   school (behavior): 3=schooling, 2=social, 1=solitary
//   agression: 1=peaceful, 2=mostly_peaceful, 3=aggressive
//   swim: 1=bottom, 2=middle, 3=top
//   breeding_difficulty: 1=easy, 2=medium, 3=hard, 4=no_record
//   region: 1=South America, 2=Africa, 3=Southeast Asia, 4=South Asia,
//           5=Central America, 6=East Asia, 7=Europe, 8=North America,
//           9=Australia, A=Artificial, W=West Asia
//   isfish: 1=fish, 0=shrimp, 2=snail, 3=crab

type Uncare = '1' | '2' | '3' | '4';
type Avail = '1' | '2' | '3' | '4';
type School = '1' | '2' | '3';
type Agress = '1' | '2' | '3';
type Swim = '1' | '2' | '3';
type Breed = '1' | '2' | '3' | '4';
type Reg = string;

function mapDifficulty(v: Uncare): Difficulty {
  return v === '4' ? 'beginner' : v === '3' ? 'easy' : v === '2' ? 'medium' : 'difficult';
}
function mapAvailability(v: Avail): Availability {
  return v === '4' ? 'very_common' : v === '3' ? 'common' : v === '2' ? 'rare' : 'very_rare';
}
function mapBehavior(v: School): BehaviorType {
  return v === '3' ? 'schooling' : v === '2' ? 'social' : 'solitary';
}
function mapAggression(v: Agress): Aggression {
  return v === '1' ? 'peaceful' : v === '2' ? 'mostly_peaceful' : 'aggressive';
}
function mapSwim(v: Swim): SwimLocation {
  return v === '1' ? 'bottom' : v === '2' ? 'middle' : 'top';
}
function mapBreeding(v: Breed): BreedingDifficulty {
  return v === '1' ? 'easy' : v === '2' ? 'medium' : v === '3' ? 'hard' : 'no_record';
}
function mapRegions(regionStr: string): Region[] {
  const codes = regionStr.split(',').map(s => s.trim()).filter(Boolean);
  const map: Record<string, Region> = {
    '1': 'south_america', '2': 'africa', '3': 'southeast_asia',
    '4': 'south_asia', '5': 'central_america', '6': 'east_asia',
    '7': 'europe', '8': 'north_america', '9': 'australia',
    'A': 'artificial', 'W': 'west_asia'
  };
  return codes.map(c => map[c]).filter(Boolean);
}
function mapCreatureType(v: string): CreatureType {
  return v === '0' ? 'shrimp' : v === '2' ? 'snail' : v === '3' ? 'crab' : 'fish';
}

function detail(
  scientificName: string,
  sizeCm: number,
  tempMin: number, tempMax: number,
  phMin: number, phMax: number,
  minTankSizeL: number,
  uncare: Uncare, availability: Avail, school: School,
  agression: Agress, swim: Swim, breeding: Breed,
  origin: string, region: Reg,
  altName?: string, family?: string, fishId?: string,
  creatureType?: string, hasExtendedInfo?: boolean
): SpeciesDetail {
  return {
    scientificName,
    sizeCm,
    tempMin, tempMax,
    phMin, phMax,
    minTankSizeL,
    difficulty: mapDifficulty(uncare),
    availability: mapAvailability(availability),
    behavior: mapBehavior(school),
    aggression: mapAggression(agression),
    swimLocation: mapSwim(swim),
    breeding: mapBreeding(breeding),
    origin,
    region: mapRegions(region),
    ...(altName ? { altName } : {}),
    ...(family ? { family } : {}),
    ...(fishId ? { fishId } : {}),
    ...(creatureType ? { creatureType: mapCreatureType(creatureType) } : {}),
    ...(hasExtendedInfo ? { hasExtendedInfo } : {}),
  };
}

// ── Species Catalog ──────────────────────────────────────────────────────────

export const SPECIES_CATALOG: SpeciesInfo[] = [\n`;

  // Write each species entry
  for (const c of catalog) {
    const args = c.detailArgs;
    // Add optional altName, family, fishId, creatureType, hasExtendedInfo
    const extra = c.extra;
    const hasExtra = extra.altName || extra.family || extra.fishId || (extra.creatureType && extra.creatureType !== '1') || extra.hasExtendedInfo;

    ts += `  {\n`;
    ts += `    id: '${c.slug}', name: ${JSON.stringify(c.name)}, displayName: ${JSON.stringify(c.displayName)},\n`;
    ts += `    imageClass: '${c.imageClass}', imagePath: '${c.imagePath}',\n`;
    ts += `    initials: '${c.initials}', color: '${c.color}',\n`;
    if (hasExtra) {
      ts += `    ...detail(${args.join(', ')}, `;
      ts += `${JSON.stringify(extra.altName || '')}, `;
      ts += `${JSON.stringify(extra.family || '')}, `;
      ts += `${JSON.stringify(extra.fishId || '')}, `;
      ts += `${JSON.stringify(extra.creatureType === '1' ? '' : (extra.creatureType || ''))}, `;
      ts += `${extra.hasExtendedInfo ? 'true' : 'undefined'}`;
      ts += `),\n`;
    } else {
      ts += `    ...detail(${args.join(', ')}),\n`;
    }
    ts += `  },\n`;
  }

  ts += `];\n\n`;

  // 8. Add utility functions (same as before, but with creatureType)
  ts += `
// ── Lookup helpers ───────────────────────────────────────────────────────────

export const getSpeciesById = (id: string): SpeciesInfo | undefined => {
  return SPECIES_CATALOG.find(s => s.id === id) ||
         SPECIES_CATALOG.find(s => s.id === id.replace(/-/g, '_'));
};

export const getSpeciesByName = (name: string): SpeciesInfo | undefined => {
  const normalized = name.toLowerCase().trim();
  return SPECIES_CATALOG.find(s => 
    s.name.toLowerCase() === normalized || 
    s.id === normalized
  );
};

export const searchSpecies = (query: string): SpeciesInfo[] => {
  if (!query.trim()) return SPECIES_CATALOG;
  const raw = query.toLowerCase().trim();
  // Tokenize: strip common punctuation, split by whitespace
  const tokens = raw
    .replace(/[(){}[\\]"',.;:!?]/g, '')
    .split(/\\s+/)
    .filter(t => t.length > 1);
  if (tokens.length === 0) return SPECIES_CATALOG;

  return SPECIES_CATALOG.filter(s => {
    const searchable = [
      s.name.toLowerCase(),
      s.displayName.toLowerCase(),
      s.scientificName?.toLowerCase() || '',
      s.altName?.toLowerCase() || '',
    ];
    // Every token must appear in at least one searchable field
    return tokens.every(token => searchable.some(field => field.includes(token)));
  });
};

export const DEFAULT_SPECIES_IMAGE = '/species-placeholder.png';

export const getSpeciesImageClass = (speciesId: string): string => {
  const species = getSpeciesById(speciesId);
  return species ? species.imageClass : 'species-unknown';
};

export const getSpeciesColor = (speciesId: string): string => {
  const species = getSpeciesById(speciesId);
  return species ? species.color : '#94A3B8';
};

export const getSpeciesInitials = (speciesId: string): string => {
  const species = getSpeciesById(speciesId);
  return species ? species.initials : '??';
};

export const getSpeciesDetail = (speciesId: string): SpeciesDetail | undefined => {
  const species = getSpeciesById(speciesId);
  if (!species) return undefined;
  const { id, name, displayName, imageClass, imagePath, initials, color, ...detail } = species;
  return Object.keys(detail).length > 0 ? (detail as SpeciesDetail) : undefined;
};

/**
 * Compatibility scoring between two species.
 * Returns a score from 0 (incompatible) to 100 (perfect match).
 */
export function getCompatibilityScore(a: SpeciesInfo, b: SpeciesInfo): number {
  let score = 100;

  // Temperature overlap check
  const tempOverlap = Math.min(a.tempMax ?? 99, b.tempMax ?? 99) - Math.max(a.tempMin ?? 0, b.tempMin ?? 0);
  if (tempOverlap <= 0) return 0;
  if (tempOverlap < 3) score -= 40;
  else if (tempOverlap < 5) score -= 20;

  // pH overlap check
  const phOverlap = Math.min(a.phMax ?? 14, b.phMax ?? 14) - Math.max(a.phMin ?? 0, b.phMin ?? 0);
  if (phOverlap <= 0) return 0;
  if (phOverlap < 0.5) score -= 30;
  else if (phOverlap < 1) score -= 15;

  // Aggression check
  if (a.aggression === 'aggressive' && b.aggression === 'peaceful') score -= 25;
  if (a.aggression === 'aggressive' && b.aggression === 'mostly_peaceful') score -= 15;
  if (a.aggression === 'mostly_peaceful' && b.aggression === 'peaceful') score -= 5;

  // Behavior compatibility
  if (a.behavior === 'solitary' && b.behavior === 'schooling') score -= 10;
  if (a.behavior === 'schooling' && b.behavior === 'solitary') score -= 10;

  return Math.max(0, Math.min(100, score));
}

export type CompatibilityLevel = 'perfect' | 'good' | 'caution' | 'warning' | 'incompatible';

export function getCompatibilityLevel(score: number): CompatibilityLevel {
  if (score >= 80) return 'perfect';
  if (score >= 60) return 'good';
  if (score >= 40) return 'caution';
  if (score >= 20) return 'warning';
  return 'incompatible';
}

export function getCompatibilityColor(level: CompatibilityLevel): string {
  switch (level) {
    case 'perfect': return '#10B981';
    case 'good': return '#3B82F6';
    case 'caution': return '#F59E0B';
    case 'warning': return '#EF4444';
    case 'incompatible': return '#DC2626';
  }
}

/**
 * Check compatibility between a proposed species and a list of existing species.
 */
export function checkTankCompatibility(
  proposed: SpeciesInfo,
  existing: SpeciesInfo[]
): { speciesId: string; speciesName: string; score: number; level: CompatibilityLevel }[] {
  return existing
    .filter(e => e.id !== proposed.id)
    .map(e => {
      const score = getCompatibilityScore(proposed, e);
      return { speciesId: e.id, speciesName: e.displayName, score, level: getCompatibilityLevel(score) };
    })
    .sort((a, b) => a.score - b.score);
}
`;

  // 9. Write the file
  fs.writeFileSync(OUTPUT_PATH, ts, 'utf8');
  console.log(`📝 Wrote ${OUTPUT_PATH}`);
  console.log(`   ${catalog.length} species in catalog (${Object.keys(overrides).length} with manual overrides).`);

  // 10. Download images
  console.log('\n📷 Downloading species images...');
  if (!fs.existsSync(IMAGE_DIR)) {
    fs.mkdirSync(IMAGE_DIR, { recursive: true });
  }

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const c of catalog) {
    // Skip if override provides a local PNG (existing local images)
    const override = overrides[c.slug];
    const isLocalPng = override?.imagePath?.endsWith('.png');
    
    if (isLocalPng) {
      skipped++;
      continue;
    }

    const url = `https://selectyourfish.com/webps1/${c.extra.fishId}.webp`;
    const dest = path.join(IMAGE_DIR, `${c.slug}.webp`);
    
    if (fs.existsSync(dest)) {
      skipped++;
      continue;
    }

    const ok = await downloadImage(url, dest);
    if (ok) {
      downloaded++;
    } else {
      failed++;
    }
  }

  console.log(`   ${downloaded} downloaded, ${skipped} skipped (existing), ${failed} failed.`);
  console.log('\n✅ Done! Run "npm run build" to verify TypeScript.');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
