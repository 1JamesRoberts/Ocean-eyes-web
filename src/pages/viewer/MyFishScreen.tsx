import React, { useState, useMemo, useEffect } from 'react';
import { useNavigation } from '../../context/NavigationContext';
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
import styles from './MyFishScreen.module.css';

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--color-text-secondary)' }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <div style={{ position: 'relative', width: '200px', height: '200px' }}>
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
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-text-primary)' }}>{total}</div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>TOTAL FISH</div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', width: '100%' }}>
        {speciesDistribution.map((species, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '3px',
              backgroundColor: species.color
            }} />
            <span style={{ color: 'var(--color-text-secondary)' }}>
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
        <div style={{
          width: s, height: s, borderRadius: '8px',
          backgroundColor: color, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: Math.round(s * 0.3),
          fontWeight: 700, color: '#fff', flexShrink: 0,
          textShadow: '0 1px 2px rgba(0,0,0,0.3)'
        }}>
          {initials}
        </div>
      );
    }
    return (
      <img src={imagePath} alt={initials}
        style={{ width: s, height: s, borderRadius: '8px', objectFit: 'contain', flexShrink: 0 }}
        onError={() => setHasError(true)}
      />
    );
  };

// ─── Detail chip component ────────────────────────────────────────────────────

const DetailChip: React.FC<{ icon: React.ReactNode; label: string; value: string; colorClass?: string }> =
  ({ icon, label, value, colorClass }) => (
    <div className={`${styles.chip} ${colorClass || styles.chipGray}`}>
      {icon}
      <span className={styles.chipLabel}>{label}</span>
      {value}
    </div>
  );

// ─── Main Component ───────────────────────────────────────────────────────────

export const MyFishScreen: React.FC = () => {
  const { setActiveTab } = useNavigation();
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
    if (!name.trim()) return;
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
    <div className={styles.container}>
      <div className={styles.titleRow}>
        <button className={styles.backButton} onClick={() => setActiveTab('home')}>
          ← Back
        </button>
        <h1 className="canvas-title" style={{ fontSize: '24px' }}>Fish Inventory</h1>
        <button
          aria-label={showAddForm ? 'Close' : 'Add fish'}
          style={{ background: 'none', border: 'none', color: 'var(--color-primary-dark)', padding: '6px', cursor: 'pointer' }}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus size={24} />
        </button>
      </div>

      {/* ─── Add Form ─── */}
      <div className={`${styles.addFormContainer} ${showAddForm ? styles.open : ''}`}>
        <form onSubmit={handleAdd} className={`card-decoration ${styles.addForm}`}>
          <h4 className={styles.addFormHeader}>Add New Species Entry</h4>
          <div>
            <label className={styles.label}>SPECIES</label>
            <SpeciesSelector
              selectedSpeciesId={selectedSpeciesId}
              onSelect={handleSpeciesSelect}
              placeholder="Search or select a species..."
              excludeSpeciesIds={fishList.map(f => f.speciesId)}
            />
          </div>
          <div className={styles.formActions}>
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
      <div className={styles.gridLayout}>
        {/* Left Column — Chart & Stats */}
        <div className={styles.leftColumn}>
          <div className="card-decoration" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <BarChart3 size={18} color="var(--color-primary-dark)" />
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Species Distribution</h3>
            </div>
            <DonutChart speciesDistribution={speciesDistribution} />
          </div>

          <div className="card-decoration" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Fish size={18} color="var(--color-primary-dark)" />
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Aquarium Overview</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { icon: <Hash size={14} />, color: 'var(--color-primary-dark)', bg: 'var(--color-primary-light)', label: 'Total Fish', value: stats.totalFish },
                { icon: <Fish size={14} />, color: 'var(--color-info)', bg: 'rgba(59, 130, 246, 0.08)', label: 'Species', value: stats.uniqueSpecies },
                { icon: <Eye size={14} />, color: 'var(--color-good)', bg: 'rgba(16, 185, 129, 0.08)', label: 'Detected', value: stats.totalDetected },
                { icon: <BarChart3 size={14} />, color: 'var(--color-warning)', bg: 'rgba(245, 158, 11, 0.08)', label: 'Detection', value: `${stats.detectionRate}%` },
              ].map((item, i) => (
                <div key={i} style={{ background: item.bg, borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: item.color }}>{item.icon}</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: item.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</span>
                  </div>
                  <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-primary)' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column — Fish Cards */}
        <div className={styles.rightColumn}>
          {fishList.length === 0 && (
            <div className={`card-decoration ${styles.emptyState}`}>
              <span style={{ fontSize: '48px' }}>🐟</span>
              <p style={{ fontSize: '16px', fontWeight: 600 }}>No fish in your inventory</p>
              <p style={{ fontSize: '13px' }}>Tap + to add your first species</p>
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
                className={`card-decoration ${styles.fishCard}`}
                onClick={() => setActiveFishId(isActive ? null : fish.id)}
              >
                {/* Main row — always visible */}
                <div className={styles.cardMainRow}>
                  <div className={styles.fishInfo}>
                    <FishThumbnail imagePath={display.imagePath} initials={display.initials} color={display.color} />
                    <div style={{ flex: 1 }}>
                      <span className={styles.fishName}>{display.name}</span>
                      {species?.scientificName && (
                        <span className={styles.scientificName}>{species.scientificName}</span>
                      )}
                      <span className={styles.fishSubtext}>
                        Visible: {fish.detected} / {fish.count}
                      </span>
                    </div>
                  </div>

                  <div className={styles.cardControls} onClick={e => e.stopPropagation()}>
                    {/* Visibility ring */}
                    {(() => {
                      const pct = fish.count > 0 ? Math.round((fish.detected / fish.count) * 100) : 0;
                      const c = pct >= 80 ? '#16A34A' : pct >= 50 ? '#D97706' : '#DC2626';
                      const r = 20, circ = 2 * Math.PI * r;
                      const dash = (circ * pct) / 100;
                      return (
                        <div className={styles.visibilityContainer}>
                          <div className={styles.visibilityRing}>
                            <svg width="44" height="44" viewBox="0 0 44 44" style={{ overflow: 'visible' }}>
                              <circle cx="22" cy="22" r={r} fill="none" stroke="#E2E8F0" strokeWidth="5" />
                              <circle cx="22" cy="22" r={r} fill="none" stroke={c} strokeWidth="5"
                                strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
                                transform="rotate(-90 22 22)" style={{ transition: 'stroke-dasharray 0.3s ease' }} />
                            </svg>
                            <div className={styles.visibilityEye}><Eye size={16} color={c} /></div>
                          </div>
                          <span className={styles.visibilityLabel} style={{ color: c }}>{pct}%</span>
                        </div>
                      );
                    })()}

                    {isActive && (
                      <>
                        <div className={styles.countControls}>
                          <button className={styles.countBtn}
                            onClick={() => updateFishCount(fish.id, Math.max(1, fish.count - 1))}>−</button>
                          <span className={styles.countValue}>{fish.count}</span>
                          <button className={styles.countBtn}
                            onClick={() => updateFishCount(fish.id, fish.count + 1)}>+</button>
                        </div>
                        <button className={styles.deleteBtn} onClick={() => setFishToDelete(fish.id)}>
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* ─── Expanded Detail Panel ─── */}
                {isActive && species && (
                  <div className={styles.detailPanel}>
                    {/* Parameter chips — 2-column grid */}
                    <div className={styles.detailGrid}>
                      <DetailChip icon={<Ruler size={14} />} label="Size" value={`${species.sizeCm} cm`} colorClass={styles.chipBlue} />
                      <DetailChip icon={<Maximize2 size={14} />} label="Tank Min" value={`${species.minTankSizeL} L`} colorClass={styles.chipGreen} />
                      <DetailChip icon={<Thermometer size={14} />} label="Temp" value={`${species.tempMin}–${species.tempMax} °C`} colorClass={styles.chipAmber} />
                      <DetailChip icon={<Droplets size={14} />} label="pH" value={`${species.phMin}–${species.phMax}`} colorClass={styles.chipPurple} />
                      <DetailChip icon={<HelpCircle size={14} />} label="Difficulty" value={difficultyLabel[species.difficulty ?? 'medium']} colorClass={styles.chipTeal} />
                      <DetailChip icon={<CheckCircle size={14} />} label="Availability" value={availabilityLabel[species.availability ?? 'common']} colorClass={styles.chipGreen} />
                      <DetailChip icon={<AlertTriangle size={14} />} label="Aggression" value={aggressionLabel[species.aggression ?? 'peaceful']} colorClass={styles.chipRed} />
                      <DetailChip icon={<Fish size={14} />} label="Behavior" value={behaviorLabel[species.behavior ?? 'social']} colorClass={styles.chipBlue} />
                      <DetailChip icon={<Fish size={14} />} label="Swim Zone" value={swimLabel[species.swimLocation ?? 'middle']} colorClass={styles.chipPurple} />
                      <DetailChip icon={<HelpCircle size={14} />} label="Breeding" value={breedingLabel[species.breeding ?? 'no_record']} colorClass={styles.chipGray} />
                    </div>

                    {/* Origin */}
                    {species.origin && (
                      <span className={styles.originBadge}>{species.origin}</span>
                    )}

                    {/* Compatibility section */}
                    {compResults.length > 0 && (
                      <div className={styles.compatibilitySection}>
                        <div className={styles.compatibilityTitle}>
                          Tank Compatibility
                        </div>
                        {compResults.map(cr => {
                          const level = getCompatibilityLevel(cr.score);
                          const color = getCompatibilityColor(level);
                          return (
                            <div key={cr.speciesId} className={styles.compRow}>
                              <div className={styles.compDot} style={{ backgroundColor: color }} />
                              <span className={styles.compName}>{cr.speciesName}</span>
                              <span className={styles.compScore} style={{ color }}>{cr.score}%</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Empty detail when no species data */}
                {isActive && !species && (
                  <div className={styles.detailPanel}>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                      No detailed species data available for this entry.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Delete Confirmation ─── */}
      {fishToDelete && (
        <div className="modal-overlay" onClick={() => setFishToDelete(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Delete Fish Entry</h3>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
              Are you sure you want to delete this fish entry? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
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
