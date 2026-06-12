import React, { useState, useMemo, useEffect } from 'react';
import { useTank } from '../../hooks/useTank';
import { useFish } from '../../hooks/useFish';
import {
  Plus, Trash2, Fish, Eye, Hash, BarChart3,
  Thermometer, Droplets, Ruler, Maximize2,
  AlertTriangle, CheckCircle, HelpCircle
} from 'lucide-react';
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

// ─── DonutChart ──────────────────────────────────────────────────────────────

interface DonutChartProps {
  speciesDistribution: { name: string; count: number; color: string; initials: string }[];
}

const DonutChart: React.FC<DonutChartProps> = ({ speciesDistribution }) => {
  if (speciesDistribution.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-text-muted">
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
      <div className="relative w-[200px] h-[200px]">
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
                style={{ transition: 'all 0.3s ease' }}
              />
            ))}
          </g>
        </svg>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="text-[28px] font-extrabold text-text-main">{total}</div>
          <div className="text-[11px] text-text-muted font-semibold">TOTAL FISH</div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 justify-center w-full">
        {speciesDistribution.map((species, index) => (
          <div key={index} className="flex items-center gap-1.5 text-xs font-semibold">
            <div 
              className="w-2.5 h-2.5 rounded-[3px]"
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
          className="rounded-lg flex items-center justify-center font-bold text-white shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
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
        className="rounded-lg object-contain shrink-0"
        style={{ width: s, height: s }}
        onError={() => setHasError(true)}
      />
    );
  };

// ─── Detail chip component ────────────────────────────────────────────────────

const DetailChip: React.FC<{ icon: React.ReactNode; label: string; value: string; colorClass?: string }> =
  ({ icon, label, value, colorClass }) => (
    <div className={`flex items-center gap-1.5 p-[8px_12px] rounded-xl text-xs font-semibold text-text-main ${colorClass || 'bg-[rgba(148,163,184,0.12)]'}`}>
      {icon}
      <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider mr-0.5">{label}</span>
      {value}
    </div>
  );

// ─── Main Component ───────────────────────────────────────────────────────────

export const MyFishScreen: React.FC = () => {
  const { tankId } = useTank();
  const { fishList, addFish, removeFish, updateFishCount } = useFish();
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
    addFish(tankId, name.trim(), imageUrl, 1);
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
    const totalDetected = fishList.reduce((sum, f) => sum + f.detected, 0);
    const uniqueSpecies = new Set(fishList.map(f => f.speciesId)).size;
    const detectionRate = totalFish > 0 ? Math.round((totalDetected / totalFish) * 100) : 0;

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

    return {
      stats: { totalFish, totalDetected, uniqueSpecies, detectionRate },
      speciesDistribution: Object.values(dist).sort((a, b) => b.count - a.count)
    };
  }, [fishList]);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      <div className="canvas-header">
        <div>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>
            My Fish
          </span>
          <h1 className="canvas-title" style={{ marginTop: '2px' }}>Fish Inventory</h1>
        </div>
        <button
          aria-label={showAddForm ? 'Close' : 'Add fish'}
          style={{ background: 'none', border: 'none', color: 'var(--color-primary-dark)', padding: '6px', cursor: 'pointer' }}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus size={24} />
        </button>
      </div>

      {/* ─── Add Form ─── */}
      <div className={`overflow-hidden transition-[max-height_0.4s_cubic-bezier(0.4,0,0.2,1),opacity_0.3s_ease,transform_0.4s_cubic-bezier(0.4,0,0.2,1),margin_0.4s_ease] -translate-y-3 origin-top relative z-50 ${
        showAddForm ? 'max-h-[500px] opacity-100 translate-y-0 mb-5' : 'max-h-0 opacity-0 pointer-events-none'
      }`}>
        <form onSubmit={handleAdd} className="bg-surface-card rounded-[20px] p-6 shadow-card border border-[rgba(13,148,136,0.02)] transition-[all_0.25s_cubic-bezier(0.4,0,0.2,1)] flex flex-col gap-3.5">
          <h4 className="text-sm font-bold text-text-main">Add New Species Entry</h4>
          <div>
            <label className="block text-[11px] text-text-muted mb-1 font-semibold uppercase tracking-wider">SPECIES</label>
            <SpeciesSelector
              selectedSpeciesId={selectedSpeciesId}
              onSelect={handleSpeciesSelect}
              placeholder="Search or select a species..."
              excludeSpeciesIds={fishList.map(f => f.speciesId)}
            />
          </div>
          <div className="flex gap-2.5 mt-1.5">
            <button className="primary-button" style={{ flex: 1, padding: '10px', fontSize: '13px' }} type="submit">
              Add Species
            </button>
            <button className="secondary-button" style={{ padding: '10px 14px', fontSize: '13px' }} type="button"
              onClick={() => { setShowAddForm(false); setName(''); setSelectedSpeciesId(null); }}>
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* ─── Layout ─── */}
      <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-6">
        {/* Left Column — Chart & Stats */}
        <div className="flex flex-col gap-4">
          <div className="bg-surface-card rounded-[20px] p-5 shadow-card border border-[rgba(13,148,136,0.02)]">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={18} className="text-primary-dark" />
              <h3 className="text-base font-bold text-text-main">Species Distribution</h3>
            </div>
            <DonutChart speciesDistribution={speciesDistribution} />
          </div>

          <div className="bg-surface-card rounded-[20px] p-5 shadow-card border border-[rgba(13,148,136,0.02)]">
            <div className="flex items-center gap-2 mb-4">
              <Fish size={18} className="text-primary-dark" />
              <h3 className="text-base font-bold text-text-main">Aquarium Overview</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: <Hash size={14} />, color: 'var(--color-primary-dark)', bg: 'var(--color-primary-light)', label: 'Total Fish', value: stats.totalFish },
                { icon: <Fish size={14} />, color: 'var(--color-info)', bg: 'rgba(59, 130, 246, 0.08)', label: 'Species', value: stats.uniqueSpecies },
                { icon: <Eye size={14} />, color: 'var(--color-good)', bg: 'rgba(16, 185, 129, 0.08)', label: 'Detected', value: stats.totalDetected },
                { icon: <BarChart3 size={14} />, color: 'var(--color-warning)', bg: 'rgba(245, 158, 11, 0.08)', label: 'Detection', value: `${stats.detectionRate}%` },
              ].map((item, i) => (
                <div key={i} style={{ background: item.bg }} className="rounded-xl p-3.5 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <span style={{ color: item.color }}>{item.icon}</span>
                    <span style={{ color: item.color }} className="text-[11px] font-bold uppercase tracking-wider">{item.label}</span>
                  </div>
                  <span className="text-2xl font-extrabold text-text-main">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column — Fish Cards */}
        <div className="flex flex-col gap-3">
          {fishList.length === 0 && (
            <div className="bg-surface-card rounded-[20px] p-10 shadow-card border border-[rgba(13,148,136,0.02)] flex flex-col items-center justify-center gap-3 text-text-muted">
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
                className="bg-surface-card rounded-[20px] shadow-card border border-[rgba(13,148,136,0.02)] cursor-pointer overflow-hidden transition-[box-shadow_0.25s_cubic-bezier(0.4,0,0.2,1)] hover:shadow-[0_8px_24px_rgba(13,148,136,0.08)] flex flex-col"
                onClick={() => setActiveFishId(isActive ? null : fish.id)}
              >
                {/* Main row — always visible */}
                <div className="flex justify-between items-center p-3">
                  <div className="flex items-center gap-3 flex-1">
                    <FishThumbnail imagePath={display.imagePath} initials={display.initials} color={display.color} />
                    <div className="flex-1">
                      <span className="text-base font-bold text-text-main block">{display.name}</span>
                      {species?.scientificName && (
                        <span className="text-xs italic text-text-muted mb-1 block font-medium">{species.scientificName}</span>
                      )}
                      <span className="block text-xs text-text-muted mt-0.5">
                        Visible: {fish.detected} / {fish.count}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5" onClick={e => e.stopPropagation()}>
                    {/* Visibility ring */}
                    {(() => {
                      const pct = fish.count > 0 ? Math.round((fish.detected / fish.count) * 100) : 0;
                      const c = pct >= 80 ? '#16A34A' : pct >= 50 ? '#D97706' : '#DC2626';
                      const r = 20, circ = 2 * Math.PI * r;
                      const dash = (circ * pct) / 100;
                      return (
                        <div className="flex items-center gap-2.5">
                          <div className="relative w-11 h-11">
                            <svg width="44" height="44" viewBox="0 0 44 44" style={{ overflow: 'visible' }}>
                              <circle cx="22" cy="22" r={r} fill="none" stroke="var(--color-border)" strokeWidth="5" />
                              <circle cx="22" cy="22" r={r} fill="none" stroke={c} strokeWidth="5"
                                strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
                                transform="rotate(-90 22 22)" style={{ transition: 'stroke-dasharray 0.3s ease' }} />
                            </svg>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"><Eye size={16} color={c} /></div>
                          </div>
                          <span className="text-[13px] font-bold min-w-[40px]" style={{ color: c }}>{pct}%</span>
                        </div>
                      );
                    })()}

                    {isActive && (
                      <>
                        <div className="flex items-center bg-background-app rounded-xl p-0.5">
                          <button className="w-6 h-6 border-none bg-transparent text-base font-extrabold cursor-pointer flex items-center justify-center text-text-main"
                            onClick={() => updateFishCount(fish.id, Math.max(1, fish.count - 1))}>−</button>
                          <span className="w-6 text-center text-[13px] font-bold text-text-main">{fish.count}</span>
                          <button className="w-6 h-6 border-none bg-transparent text-base font-extrabold cursor-pointer flex items-center justify-center text-text-main"
                            onClick={() => updateFishCount(fish.id, fish.count + 1)}>+</button>
                        </div>
                        <button className="bg-transparent border-none text-[#94A3B8] cursor-pointer flex p-1 transition-colors duration-200 hover:text-critical" onClick={() => setFishToDelete(fish.id)}>
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* ─── Expanded Detail Panel ─── */}
                <div className={`grid transition-[grid-template-rows_0.35s_cubic-bezier(0.4,0,0.2,1)] ${isActive && species ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden">
                    <div className={`p-[0_12px_16px_12px] transition-[opacity_0.3s_ease,transform_0.35s_cubic-bezier(0.4,0,0.2,1)] ${isActive && species ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'}`}>
                      {species && (
                        <>
                          {/* Parameter chips — 2-column grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3.5">
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
                            <span className="text-[11px] p-[4px_10px] rounded-[20px] bg-[rgba(13,148,136,0.08)] text-primary-dark font-semibold inline-block">{species.origin}</span>
                          )}

                          {/* Compatibility section */}
                          {compResults.length > 0 && (
                            <div className="mt-4">
                              <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">
                                Tank Compatibility
                              </div>
                              {compResults.map(cr => {
                                const level = getCompatibilityLevel(cr.score);
                                const color = getCompatibilityColor(level);
                                return (
                                  <div key={cr.speciesId} className="flex items-center gap-2 py-1.5 border-b border-border-card last:border-b-0">
                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                    <span className="text-xs font-semibold text-text-main flex-1">{cr.speciesName}</span>
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
            <h3 className="text-lg font-bold text-text-main mb-2">Delete Fish Entry</h3>
            <p className="text-sm text-text-muted mb-6">
              Are you sure you want to delete this fish entry? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button className="secondary-button" style={{ padding: '10px 20px', fontSize: '14px' }}
                onClick={() => setFishToDelete(null)}>Cancel</button>
              <button className="primary-button" style={{
                padding: '10px 20px', fontSize: '14px',
                backgroundColor: 'var(--color-critical)',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)'
              }} onClick={() => { if (fishToDelete) { removeFish(fishToDelete); setFishToDelete(null); } }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
