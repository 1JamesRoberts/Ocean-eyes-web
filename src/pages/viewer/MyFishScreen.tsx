import React, { useState, useMemo, useEffect } from 'react';
import { useTank } from '../../hooks/useTank';
import { useFish } from '../../hooks/useFish';
import {
  Plus, Trash2, Fish, Hash, BarChart3,
  Thermometer, Droplets, Ruler, Maximize2,
  AlertTriangle, CheckCircle, HelpCircle
} from 'lucide-react';
import DetectionVisibilityRing from '../../components/fish/DetectionVisibilityRing';
import { SpeciesSelector } from '../../components/SpeciesSelector';
import {
  getSpeciesById, getSpeciesColor, getSpeciesInitials,
  type SpeciesInfo
} from '../../data/speciesCatalog';
import { checkTankCompatibility, getCompatibilityLevel, getCompatibilityColor } from '../../data/speciesCatalog';
import type { Difficulty, Aggression, BehaviorType, SwimLocation, Availability, BreedingDifficulty } from '../../types/aquarium';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const difficultyLabel: Record<Difficulty, string> = {
  beginner: 'Beginner', easy: 'Easy', medium: 'Medium', difficult: 'Difficult'
};
const aggressionLabel: Record<Aggression, string> = {
  peaceful: 'Peaceful', mostly_peaceful: 'Mostly Peaceful', aggressive: 'Aggressive'
};
const behaviorLabel: Record<BehaviorType, string> = {
  schooling: 'Schooling', social: 'Social', solitary: 'Solitary'
};
const swimLabel: Record<SwimLocation, string> = {
  bottom: 'Bottom', middle: 'Middle', top: 'Top'
};
const availabilityLabel: Record<Availability, string> = {
  very_common: 'Very Common', common: 'Common', rare: 'Rare', very_rare: 'Very Rare'
};
const breedingLabel: Record<BreedingDifficulty, string> = {
  easy: 'Easy', medium: 'Medium', hard: 'Hard', no_record: 'No Record'
};

// ─── Range Helpers ────────────────────────────────────────────────────────────

function intersectRanges(
  ranges: Array<{ min: number; max: number }>
): { range: [number, number] | null; conflict: boolean } {
  if (ranges.length === 0) return { range: null, conflict: false };

  let low = -Infinity;
  let high = Infinity;

  for (const r of ranges) {
    low = Math.max(low, r.min);
    high = Math.min(high, r.max);
  }

  if (low <= high) {
    // Normal intersection
    return { range: [low, high], conflict: false };
  }

  // No overlap — return the full span (union) and flag conflict
  const allMins = ranges.map(r => r.min);
  const allMaxs = ranges.map(r => r.max);
  return { range: [Math.min(...allMins), Math.max(...allMaxs)], conflict: true };
}

function formatRange(min: number, max: number, unit: string, decimals?: number): string {
  const d = decimals ?? (Number.isInteger(min) && Number.isInteger(max) ? 0 : 1);
  const fmt = (v: number) => (d === 0 ? v.toString() : v.toFixed(d));
  if (min === max) return `${fmt(min)}${unit ? ` ${unit}` : ''}`;
  return `${fmt(min)}\u2013${fmt(max)} ${unit}`;
}

// ─── DonutChart ──────────────────────────────────────────────────────────────

interface DonutChartProps {
  speciesDistribution: { name: string; count: number; color: string; initials: string }[];
}

const DonutChart: React.FC<DonutChartProps> = ({ speciesDistribution }) => {
  if (speciesDistribution.length === 0) {
    return (
      <div className="
        flex h-[200px] items-center justify-center text-text-muted
      ">
        No fish data available
      </div>
    );
  }

  const total = speciesDistribution.reduce((sum, s) => sum + s.count, 0);
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  
  const segmentsWithOffsets = speciesDistribution.reduce<
    Array<{ species: typeof speciesDistribution[0]; dashLength: number; gapLength: number; index: number; offset: number }>
  >((acc, species, index) => {
    const percentage = species.count / total;
    const dashLength = circumference * percentage;
    const gapLength = circumference - dashLength;
    const offset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].dashLength : 0;
    acc.push({ species, dashLength, gapLength, index, offset });
    return acc;
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative size-[200px]">
        <svg width="200" height="200" viewBox="0 0 200 200">
          <g transform="rotate(-90 100 100)">
            {segmentsWithOffsets.map(({ species, dashLength, gapLength, offset, index }) => (
              <circle
                key={index}
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke={species.color}
                strokeWidth="24"
                strokeDasharray={`${dashLength} ${gapLength}`}
                strokeDashoffset={-offset}
                className="transition-all duration-300 ease-in-out"
              />
            ))}
          </g>
        </svg>
        <div className="absolute top-1/2 left-1/2 -translate-1/2 text-center">
          <div className="text-[28px] font-extrabold text-text-main">{total}</div>
          <div className="text-[11px] font-semibold text-text-muted">TOTAL FISH</div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex w-full flex-wrap justify-center gap-2">
        {speciesDistribution.map((species, index) => (
          <div key={index} className="
            flex items-center gap-1.5 text-xs font-semibold
          ">
            <div 
              className="size-2.5 rounded-[3px]"
              style={{ backgroundColor: species.color }} 
            />
            <span className="text-text-muted">
              {species.name} ({species.count})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── FishThumbnail ────────────────────────────────────────────────────────────

const FishThumbnail: React.FC<{ imagePath?: string; initials: string; color: string; size?: number }> =
  ({ imagePath, initials, color, size = 40 }) => {
    const [hasError, setHasError] = useState(false);
    const s = size;
    if (!imagePath || hasError) {
      return (
        <div 
          className="
            flex shrink-0 items-center justify-center rounded-lg font-bold
            text-white shadow-[0_1px_2px_rgba(0,0,0,0.3)]
          "
          style={{
            width: s, height: s,
            backgroundColor: color, fontSize: Math.round(s * 0.3),
            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
          }}
        >
          {initials}
        </div>
      );
    }
    return (
      <img src={imagePath} alt={initials}
        className="shrink-0 rounded-lg object-contain"
        style={{ width: s, height: s }}
        onError={() => setHasError(true)}
      />
    );
  };

// ─── Detail chip component ────────────────────────────────────────────────────

const DetailChip: React.FC<{ icon: React.ReactNode; label: string; value: string; colorClass?: string }> =
  ({ icon, label, value, colorClass }) => (
    <div className={`
      flex items-center gap-1.5 rounded-xl p-[8px_12px] text-xs font-semibold
      text-text-main
      ${colorClass || `bg-[rgba(148,163,184,0.12)]`}
    `}>
      {icon}
      <span className="
        mr-0.5 text-[10px] font-medium tracking-wider text-text-muted uppercase
      ">{label}</span>
      {value}
    </div>
  );

// ─── Main Component ───────────────────────────────────────────────────────────

export const MyFishScreen: React.FC = () => {
  const { tankId } = useTank();
  const { fishList, addFish, removeFish, updateFishCount } = useFish(tankId);
  const [name, setName] = useState('');
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeFishId, setActiveFishId] = useState<string | null>(null);
  const [fishToDelete, setFishToDelete] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const fishCard = target.closest('[data-fish-card]');
      if (!fishCard) setActiveFishId(null);
    };
    if (activeFishId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [activeFishId]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !tankId) return;
    const species = selectedSpeciesId ? getSpeciesById(selectedSpeciesId) : null;
    const imageUrl = species ? species.imagePath : '/species-placeholder.png';
    addFish(name.trim(), imageUrl, 1);
    setName('');
    setSelectedSpeciesId(null);
    setShowAddForm(false);
  };

  const handleSpeciesSelect = (species: SpeciesInfo | null, customName?: string) => {
    if (species) { setSelectedSpeciesId(species.id); setName(species.name); }
    else if (customName) { setSelectedSpeciesId(null); setName(customName); }
  };

  const getSpeciesDisplay = (fish: typeof fishList[0]) => {
    const species = getSpeciesById(fish.speciesId);
    if (species) {
      return { initials: species.initials, color: species.color, name: species.displayName, imagePath: species.imagePath };
    }
    return { initials: getSpeciesInitials(fish.speciesId), color: getSpeciesColor(fish.speciesId), name: fish.name, imagePath: undefined as string | undefined };
  };

  // ─── Memoized stats ──────────────────────────────────────────────────────

  const { stats, speciesDistribution } = useMemo(() => {
    const totalFish = fishList.reduce((sum, f) => sum + f.count, 0);
    const uniqueSpecies = new Set(fishList.map(f => f.speciesId)).size;

    // ── Ideal parameter computation ────────────────────────────────────────
    const speciesData = fishList
      .map(f => getSpeciesById(f.speciesId))
      .filter((s): s is SpeciesInfo => !!s);

    // Tank size: max of all species' minimum requirements
    let idealTankSizeL: number | null = null;
    if (speciesData.length > 0) {
      idealTankSizeL = Math.max(...speciesData.map(s => s.minTankSizeL));
    }

    // Temperature: intersection of all species' ranges
    const tempRanges = speciesData
      .filter(s => s.tempMin !== undefined && s.tempMax !== undefined)
      .map(s => ({ min: s.tempMin!, max: s.tempMax! }));
    const tempResult = intersectRanges(tempRanges);

    // pH: intersection of all species' ranges
    const phRanges = speciesData
      .filter(s => s.phMin !== undefined && s.phMax !== undefined)
      .map(s => ({ min: s.phMin!, max: s.phMax! }));
    const phResult = intersectRanges(phRanges);

    // ── Species distribution ────────────────────────────────────────────────
    const dist: Record<string, { name: string; count: number; color: string; initials: string }> = {};
    fishList.forEach(fish => {
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

    return {
      stats: { totalFish, uniqueSpecies, idealTankSizeL, tempResult, phResult, totalDetected, totalExpected },
      speciesDistribution: Object.values(dist).sort((a, b) => b.count - a.count)
    };
  }, [fishList]);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      <div className="
        flex min-h-[75px] items-center justify-between border-b
        border-border-card pb-3
        max-xs:flex-col max-xs:items-start max-xs:gap-3
      ">
        <div>
          <span className="
            block text-xs font-semibold text-text-muted uppercase
          ">
            My Fish
          </span>
          <h1 className="mt-0.5 text-[28px] font-extrabold text-text-main">Fish Inventory</h1>
        </div>
        <button
          aria-label={showAddForm ? 'Close' : 'Add fish'}
          className="
            cursor-pointer border-none bg-transparent p-1.5 text-primary-dark
          "
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus size={24} />
        </button>
      </div>

      {/* ─── Add Form ─── */}
      <div className={`
        relative z-50 origin-top -translate-y-3 overflow-hidden
        transition-[max-height_0.4s_cubic-bezier(0.4,0,0.2,1),opacity_0.3s_ease,transform_0.4s_cubic-bezier(0.4,0,0.2,1),margin_0.4s_ease]
        ${
        showAddForm ? 'mb-5 max-h-[500px] translate-y-0 opacity-100' : `
          pointer-events-none max-h-0 opacity-0
        `
      }
      `}>
        <form onSubmit={handleAdd} className="
          flex flex-col gap-3.5 rounded-[20px] border
          border-[rgba(13,148,136,0.02)] bg-surface-card p-6 shadow-card
          transition-smooth
        ">
          <h4 className="text-sm font-bold text-text-main">Add New Species Entry</h4>
          <div>
            <label className="
              mb-1 block text-[11px] font-semibold tracking-wider
              text-text-muted uppercase
            ">SPECIES</label>
            <SpeciesSelector
              selectedSpeciesId={selectedSpeciesId}
              onSelect={handleSpeciesSelect}
              placeholder="Search or select a species..."
              excludeSpeciesIds={fishList.map(f => f.speciesId)}
            />
          </div>
          <div className="mt-1.5 flex gap-2.5">
            <button className="
              inline-flex flex-1 cursor-pointer items-center justify-center
              gap-2 rounded-3xl border-none bg-primary-gradient px-5 py-2.5
              font-main text-[13px] font-semibold text-text-inv
              shadow-[0_4px_12px_rgba(13,148,136,0.15)] transition-smooth
              hover:bg-primary-hover-gradient
              active:scale-[0.98]
            " type="submit">
              Add Species
            </button>
            <button className="
              inline-flex cursor-pointer items-center justify-center gap-2
              rounded-3xl border border-border-card bg-surface-card px-3.5
              py-2.5 font-main text-[13px] font-semibold text-text-main
              transition-smooth
              hover:border-text-muted hover:bg-surface-hover
            " type="button"
              onClick={() => { setShowAddForm(false); setName(''); setSelectedSpeciesId(null); }}>
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* ─── Layout ─── */}
      <div className="
        grid grid-cols-1 gap-6
        md:grid-cols-[2fr_3fr]
      ">
        {/* Left Column — Chart & Stats */}
        <div className="flex flex-col gap-4">
          <div className="
            rounded-[20px] border border-[rgba(13,148,136,0.02)] bg-surface-card
            p-5 shadow-card
          ">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 size={18} className="text-primary-dark" />
              <h3 className="text-base font-bold text-text-main">Species Distribution</h3>
            </div>
            <DonutChart speciesDistribution={speciesDistribution} />
          </div>

          <div className="
            rounded-[20px] border border-[rgba(13,148,136,0.02)] bg-surface-card
            p-5 shadow-card
          ">
            <div className="mb-4 flex items-center gap-2">
              <Fish size={18} className="text-primary-dark" />
              <h3 className="text-base font-bold text-text-main">Aquarium Overview</h3>
              <div className="ml-auto">
                <DetectionVisibilityRing
                  detected={stats.totalDetected}
                  expected={stats.totalExpected}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: <Hash size={14} />, color: 'var(--color-primary-dark)', bg: 'var(--color-primary-light)', label: 'Total Fish', value: stats.totalFish },
                { icon: <Fish size={14} />, color: 'var(--color-info)', bg: 'rgba(59, 130, 246, 0.08)', label: 'Species', value: stats.uniqueSpecies },
              ].map((item, i) => (
                <div key={i} style={{ background: item.bg }} className="
                  flex flex-col gap-1 rounded-xl p-3.5
                ">
                  <div className="flex items-center gap-1.5">
                    <span style={{ color: item.color }}>{item.icon}</span>
                    <span style={{ color: item.color }} className="
                      text-[11px] font-bold tracking-wider uppercase
                    ">{item.label}</span>
                  </div>
                  <span className="text-2xl font-extrabold text-text-main">{item.value}</span>
                </div>
              ))}
            </div>

            {/* ── Ideal Parameters ── */}
            <div className="mt-4 border-t border-border-card pt-4">
              <span className="
                mb-3 block text-[11px] font-bold tracking-wider
                text-text-muted uppercase
              ">
                Ideal Parameters
              </span>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  {
                    icon: <Maximize2 size={14} />,
                    color: 'var(--color-primary-dark)',
                    bg: 'var(--color-primary-light)',
                    label: 'Tank Size',
                    value: stats.idealTankSizeL != null ? `${stats.idealTankSizeL} L` : '\u2014',
                  },
                  {
                    icon: <Thermometer size={14} />,
                    color: 'var(--color-warning)',
                    bg: 'rgba(245, 158, 11, 0.08)',
                    label: 'Temperature',
                    value: stats.tempResult.range != null
                      ? formatRange(stats.tempResult.range[0], stats.tempResult.range[1], '\u00b0C')
                      : '\u2014',
                    conflict: stats.tempResult.conflict,
                  },
                  {
                    icon: <Droplets size={14} />,
                    color: 'rgba(147, 112, 219, 1)',
                    bg: 'rgba(147, 112, 219, 0.08)',
                    label: 'pH',
                    value: stats.phResult.range != null
                      ? formatRange(stats.phResult.range[0], stats.phResult.range[1], '', 1)
                      : '\u2014',
                    conflict: stats.phResult.conflict,
                  },
                ].map((item, i) => (
                  <div key={i} style={{ background: item.bg }} className="
                    flex flex-col gap-1 rounded-xl p-3.5
                  ">
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: item.color }}>{item.icon}</span>
                      <span style={{ color: item.color }} className="
                        text-[11px] font-bold tracking-wider uppercase
                      ">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-2xl font-extrabold text-text-main">{item.value}</span>
                      {(item as any).conflict && (
                        <span
                          className="mt-0.5 shrink-0"
                          title="Species have conflicting requirements \u2014 showing the full range"
                        >
                          <AlertTriangle size={14} className="text-critical" />
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column — Fish Cards */}
        <div className="flex flex-col gap-3">
          {fishList.length === 0 && (
            <div className="
              flex flex-col items-center justify-center gap-3 rounded-[20px]
              border border-[rgba(13,148,136,0.02)] bg-surface-card p-10
              text-text-muted shadow-card
            ">
              <span className="text-5xl">🐟</span>
              <p className="text-base font-bold text-text-main">No fish in your inventory</p>
              <p className="text-xs">Tap + to add your first species</p>
            </div>
          )}

          {fishList.map(fish => {
            const display = getSpeciesDisplay(fish);
            const isActive = activeFishId === fish.id;
            const species = getSpeciesById(fish.speciesId);

            // Compute compatibility with all other tank inhabitants
            const allSpecies = fishList
              .map(f => getSpeciesById(f.speciesId))
              .filter((s): s is SpeciesInfo => !!s);

            const compResults = species
              ? checkTankCompatibility(species, allSpecies)
              : [];

            return (
              <div key={fish.id} data-fish-card
                className="
                  flex cursor-pointer flex-col overflow-hidden rounded-[20px]
                  border border-[rgba(13,148,136,0.02)] bg-surface-card
                  shadow-card
                  transition-[box-shadow_0.25s_cubic-bezier(0.4,0,0.2,1)]
                  hover:shadow-[0_8px_24px_rgba(13,148,136,0.08)]
                "
                onClick={() => setActiveFishId(isActive ? null : fish.id)}
              >
                {/* Main row — always visible */}
                <div className="flex items-center justify-between p-3">
                  <div className="flex flex-1 items-center gap-3">
                    <FishThumbnail imagePath={display.imagePath} initials={display.initials} color={display.color} />
                    <div className="flex-1">
                      <span className="block text-base font-bold text-text-main">{display.name}</span>
                      {species?.scientificName && (
                        <span className="
                          mb-1 block text-xs font-medium text-text-muted italic
                        ">{species.scientificName}</span>
                      )}
                      <span className="mt-0.5 block text-xs text-text-muted">
                        Visible: {fish.detected} / {fish.count}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5" onClick={e => e.stopPropagation()}>
                    {/* Visibility ring */}
                    <DetectionVisibilityRing
                      detected={fish.detected}
                      expected={fish.count}
                    />

                    {isActive && (
                      <>
                        <div className="
                          flex items-center rounded-xl bg-background-app p-0.5
                        ">
                          <button className="
                            flex size-6 cursor-pointer items-center
                            justify-center border-none bg-transparent text-base
                            font-extrabold text-text-main
                          "
                            onClick={() => updateFishCount(fish.id, Math.max(1, fish.count - 1))}>−</button>
                          <span className="
                            w-6 text-center text-[13px] font-bold text-text-main
                          ">{fish.count}</span>
                          <button className="
                            flex size-6 cursor-pointer items-center
                            justify-center border-none bg-transparent text-base
                            font-extrabold text-text-main
                          "
                            onClick={() => updateFishCount(fish.id, fish.count + 1)}>+</button>
                        </div>
                        <button className="
                          flex cursor-pointer border-none bg-transparent p-1
                          text-[#94A3B8] transition-colors duration-200
                          hover:text-critical
                        " onClick={() => setFishToDelete(fish.id)}>
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* ─── Expanded Detail Panel ─── */}
                <div className={`
                  grid
                  transition-[grid-template-rows_0.35s_cubic-bezier(0.4,0,0.2,1)]
                  ${isActive && species ? `grid-rows-[1fr]` : `grid-rows-[0fr]`}
                `}>
                  <div className="overflow-hidden">
                    <div className={`
                      p-[0_12px_16px_12px]
                      transition-[opacity_0.3s_ease,transform_0.35s_cubic-bezier(0.4,0,0.2,1)]
                      ${isActive && species ? 'translate-y-0 opacity-100' : `
                        -translate-y-3 opacity-0
                      `}
                    `}>
                      {species && (
                        <>
                          {/* Parameter chips — 2-column grid */}
                          <div className="
                            mb-3.5 grid grid-cols-1 gap-3
                            sm:grid-cols-2
                          ">
                            <DetailChip icon={<Ruler size={14} />} label="Size" value={`${species.sizeCm} cm`} colorClass="bg-[rgba(59,130,246,0.08)]" />
                            <DetailChip icon={<Maximize2 size={14} />} label="Tank Min" value={`${species.minTankSizeL} L`} colorClass="bg-[rgba(16,185,129,0.08)]" />
                            <DetailChip icon={<Thermometer size={14} />} label="Temp" value={`${species.tempMin}–${species.tempMax} °C`} colorClass="bg-[rgba(245,158,11,0.08)]" />
                            <DetailChip icon={<Droplets size={14} />} label="pH" value={`${species.phMin}–${species.phMax}`} colorClass="bg-[rgba(147,112,219,0.08)]" />
                            <DetailChip icon={<HelpCircle size={14} />} label="Difficulty" value={difficultyLabel[species.difficulty ?? 'medium']} colorClass="bg-[rgba(13,148,136,0.08)]" />
                            <DetailChip icon={<CheckCircle size={14} />} label="Availability" value={availabilityLabel[species.availability ?? 'common']} colorClass="bg-[rgba(16,185,129,0.08)]" />
                            <DetailChip icon={<AlertTriangle size={14} />} label="Aggression" value={aggressionLabel[species.aggression ?? 'peaceful']} colorClass="bg-[rgba(239,68,68,0.08)]" />
                            <DetailChip icon={<Fish size={14} />} label="Behavior" value={behaviorLabel[species.behavior ?? 'social']} colorClass="bg-[rgba(59,130,246,0.08)]" />
                            <DetailChip icon={<Fish size={14} />} label="Swim Zone" value={swimLabel[species.swimLocation ?? 'middle']} colorClass="bg-[rgba(147,112,219,0.08)]" />
                            <DetailChip icon={<HelpCircle size={14} />} label="Breeding" value={breedingLabel[species.breeding ?? 'no_record']} colorClass="bg-[rgba(148,163,184,0.12)]" />
                          </div>

                          {/* Origin */}
                          {species.origin && (
                            <span className="
                              inline-block rounded-[20px]
                              bg-[rgba(13,148,136,0.08)] p-[4px_10px]
                              text-[11px] font-semibold text-primary-dark
                            ">{species.origin}</span>
                          )}

                          {/* Compatibility section */}
                          {compResults.length > 0 && (
                            <div className="mt-4">
                              <div className="
                                mb-2 text-[11px] font-bold tracking-wider
                                text-text-muted uppercase
                              ">
                                Tank Compatibility
                              </div>
                              {compResults.map(cr => {
                                const level = getCompatibilityLevel(cr.score);
                                const color = getCompatibilityColor(level);
                                return (
                                  <div key={cr.speciesId} className="
                                    flex items-center gap-2 border-b
                                    border-border-card py-1.5
                                    last:border-b-0
                                  ">
                                    <div className="
                                      size-2 shrink-0 rounded-full
                                    " style={{ backgroundColor: color }} />
                                    <span className="
                                      flex-1 text-xs font-semibold
                                      text-text-main
                                    ">{cr.speciesName}</span>
                                    <span className="text-[11px] font-bold" style={{ color }}>{cr.score}%</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                      {!species && (
                        <p className="text-xs text-text-muted">
                          No detailed species data available for this entry.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Delete Confirmation ─── */}
      {fishToDelete && (
        <div className="modal-overlay" onClick={() => setFishToDelete(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="mb-2 text-lg font-bold text-text-main">Delete Fish Entry</h3>
            <p className="mb-6 text-sm text-text-muted">
              Are you sure you want to delete this fish entry? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button className="
                inline-flex cursor-pointer items-center justify-center gap-2
                rounded-3xl border border-border-card bg-surface-card px-5
                py-2.5 font-main text-sm font-semibold text-text-main
                transition-smooth
                hover:border-text-muted hover:bg-surface-hover
              "
                onClick={() => setFishToDelete(null)}>Cancel</button>
              <button className="
                inline-flex cursor-pointer items-center justify-center gap-2
                rounded-3xl border-none bg-critical px-5 py-2.5 font-main
                text-sm font-semibold text-text-inv
                shadow-[0_4px_12px_rgba(239,68,68,0.15)] transition-smooth
                hover:opacity-90
                active:scale-[0.98]
              "
                onClick={() => { if (fishToDelete) { removeFish(fishToDelete); setFishToDelete(null); } }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
