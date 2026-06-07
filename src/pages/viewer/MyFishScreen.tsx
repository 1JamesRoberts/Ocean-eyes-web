import React, { useState, useMemo, useEffect } from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { useTank } from '../../hooks/useTank';
import { useFish } from '../../hooks/useFish';
import { Plus, Trash2, Fish, Eye, Hash, BarChart3 } from 'lucide-react';
import { SpeciesSelector } from '../../components/SpeciesSelector';
import { getSpeciesById, getSpeciesColor, getSpeciesInitials, type SpeciesInfo } from '../../data/speciesCatalog';

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
  
  // Pre-calculate offsets without mutation
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
      const fishCard = target.closest('.fish-card');
      if (!fishCard) {
        setActiveFishId(null);
      }
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
    const imageUrl = species ? species.imageClass : 'species-unknown';
    
    addFish(name.trim(), imageUrl, 1);
    setName('');
    setSelectedSpeciesId(null);
    setShowAddForm(false);
  };

  const handleSpeciesSelect = (species: SpeciesInfo | null, customName?: string) => {
    if (species) {
      setSelectedSpeciesId(species.id);
      setName(species.name);
    } else if (customName) {
      setSelectedSpeciesId(null);
      setName(customName);
    }
  };

  const FishThumbnail: React.FC<{ imagePath?: string; initials: string; color: string }> = ({ imagePath, initials, color }) => {
  const [hasError, setHasError] = useState(false);
  if (!imagePath || hasError) {
    return (
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          backgroundColor: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 700,
          color: '#fff',
          flexShrink: 0,
          textShadow: '0 1px 2px rgba(0,0,0,0.3)'
        }}
      >
        {initials}
      </div>
    );
  }
  return (
    <img
      src={imagePath}
      alt={initials}
      style={{
        width: '40px',
        height: '40px',
        objectFit: 'contain',
        flexShrink: 0
      }}
      onError={() => setHasError(true)}
    />
  );
};

  const getSpeciesDisplay = (fish: typeof fishList[0]) => {
    const species = getSpeciesById(fish.speciesId);
    if (species) {
      return {
        initials: species.initials,
        color: species.color,
        name: species.displayName,
        imagePath: species.imagePath
      };
    }
    return {
      initials: getSpeciesInitials(fish.speciesId),
      color: getSpeciesColor(fish.speciesId),
      name: fish.name,
      imagePath: undefined as string | undefined
    };
  };

  // Compute stats and species distribution
  const stats = useMemo(() => {
    const totalFish = fishList.reduce((sum, f) => sum + f.count, 0);
    const totalDetected = fishList.reduce((sum, f) => sum + f.detected, 0);
    const uniqueSpecies = new Set(fishList.map(f => f.speciesId)).size;
    const detectionRate = totalFish > 0 ? Math.round((totalDetected / totalFish) * 100) : 0;
    return { totalFish, totalDetected, uniqueSpecies, detectionRate };
  }, [fishList]);

  const speciesDistribution = useMemo(() => {
    const distribution: Record<string, { name: string; count: number; color: string; initials: string }> = {};
    fishList.forEach(fish => {
      const species = getSpeciesById(fish.speciesId);
      let name: string;
      let color: string;
      let initials: string;
      
      if (species) {
        name = species.displayName;
        color = species.color;
        initials = species.initials;
      } else {
        name = fish.name;
        color = getSpeciesColor(fish.speciesId);
        initials = getSpeciesInitials(fish.speciesId);
      }
      
      if (distribution[fish.speciesId]) {
        distribution[fish.speciesId].count += fish.count;
      } else {
        distribution[fish.speciesId] = {
          name,
          count: fish.count,
          color,
          initials
        };
      }
    });
    return Object.values(distribution).sort((a, b) => b.count - a.count);
  }, [fishList]);

  return (
    <div style={{ padding: '0 20px 30px 20px' }}>
      <div className="canvas-header" style={{ marginBottom: '24px' }}>
        <button 
          aria-label="Go back to home"
          style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-main)' }}
          onClick={() => setActiveTab('home')}
        >
          ← Back
        </button>
        <h1 className="canvas-title" style={{ fontSize: '24px' }}>Fish Inventory</h1>
        <button 
          aria-label={showAddForm ? 'Close add fish form' : 'Add new fish'}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-primary)',
            padding: '6px',
            cursor: 'pointer'
          }}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Add New Fish Species Form */}
      <div style={{
        maxHeight: showAddForm ? '500px' : '0px',
        opacity: showAddForm ? 1 : 0,
        overflow: showAddForm ? 'visible' : 'hidden',
        transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease, transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), margin 0.4s ease',
        transform: showAddForm ? 'translateY(0)' : 'translateY(-12px)',
        marginBottom: showAddForm ? '20px' : '0px',
        transformOrigin: 'top center',
        position: 'relative',
        zIndex: 50
      }}>
        <form onSubmit={handleAdd} className="card-decoration" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative', zIndex: 10 }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700 }}>Add New Species Entry</h4>
          
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px', fontWeight: 600 }}>SPECIES</label>
            <SpeciesSelector
              selectedSpeciesId={selectedSpeciesId}
              onSelect={handleSpeciesSelect}
              placeholder="Search or select a species..."
              excludeSpeciesIds={fishList.map(f => f.speciesId)}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button className="primary-button" style={{ flex: 1, padding: '10px', fontSize: '13px' }} type="submit">
              Add Species
            </button>
            <button 
              className="secondary-button" 
              style={{ padding: '10px 14px', fontSize: '13px', borderRadius: '24px' }} 
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setName('');
                setSelectedSpeciesId(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* Two-column layout: Left sidebar + Fish list */}
      <div className="fish-inventory-grid">
        {/* Left Sidebar - Chart & Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Species Distribution Chart */}
          <div className="card-decoration" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <BarChart3 size={18} color="var(--color-primary)" />
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Species Distribution</h3>
            </div>
            <DonutChart speciesDistribution={speciesDistribution} />
          </div>

          {/* Aquarium Overview Stats */}
          <div className="card-decoration" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Fish size={18} color="var(--color-primary)" />
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Aquarium Overview</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ 
                background: 'var(--color-primary-light)', 
                borderRadius: '12px', 
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Hash size={14} color="var(--color-primary-dark)" />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-primary-dark)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Fish</span>
                </div>
                <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-primary)' }}>{stats.totalFish}</span>
              </div>

              <div style={{ 
                background: 'rgba(59, 130, 246, 0.08)', 
                borderRadius: '12px', 
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Fish size={14} color="var(--color-info)" />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-info)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Species</span>
                </div>
                <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-primary)' }}>{stats.uniqueSpecies}</span>
              </div>

              <div style={{ 
                background: 'rgba(16, 185, 129, 0.08)', 
                borderRadius: '12px', 
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Eye size={14} color="var(--color-good)" />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-good)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Detected</span>
                </div>
                <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-primary)' }}>{stats.totalDetected}</span>
              </div>

              <div style={{ 
                background: 'rgba(245, 158, 11, 0.08)', 
                borderRadius: '12px', 
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BarChart3 size={14} color="var(--color-warning)" />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-warning)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Detection</span>
                </div>
                <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-primary)' }}>{stats.detectionRate}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Fish List details with controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {fishList.map(fish => {
          const display = getSpeciesDisplay(fish);
          const isActive = activeFishId === fish.id;

          return (
            <div 
              key={fish.id} 
              className="card-decoration fish-card" 
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', cursor: 'pointer' }}
              onClick={() => {
                if (!isActive) {
                  setActiveFishId(fish.id);
                } else {
                  setActiveFishId(null);
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <FishThumbnail imagePath={display.imagePath} initials={display.initials} color={display.color} />
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: '16px', color: 'var(--color-text-primary)' }}>{display.name}</strong>
                  <span style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    Current Visibility: {fish.detected} / {fish.count}
                  </span>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }} onClick={e => e.stopPropagation()}>
                {/* Visibility Donut Chart */}
                {(() => {
                  const visibilityPercent = fish.count > 0 ? Math.round((fish.detected / fish.count) * 100) : 0;
                  const barColor = visibilityPercent >= 80 ? '#16A34A' : visibilityPercent >= 50 ? '#D97706' : '#DC2626';
                  const radius = 20;
                  const circumference = 2 * Math.PI * radius;
                  const dashLength = (circumference * visibilityPercent) / 100;
                  const gapLength = circumference - dashLength;
                  
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ position: 'relative', width: '44px', height: '44px' }}>
                        <svg width="44" height="44" viewBox="0 0 44 44" style={{ overflow: 'visible' }}>
                          <circle
                            cx="22"
                            cy="22"
                            r={radius}
                            fill="none"
                            stroke="#E2E8F0"
                            strokeWidth="5"
                          />
                          <circle
                            cx="22"
                            cy="22"
                            r={radius}
                            fill="none"
                            stroke={barColor}
                            strokeWidth="5"
                            strokeDasharray={`${dashLength} ${gapLength}`}
                            strokeLinecap="round"
                            transform="rotate(-90 22 22)"
                            style={{ transition: 'stroke-dasharray 0.3s ease' }}
                          />
                        </svg>
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)'
                        }}>
                          <Eye size={16} color={barColor} />
                        </div>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: barColor, minWidth: '40px' }}>
                        {visibilityPercent}%
                      </span>
                    </div>
                  );
                })()}
                
                {isActive && (
                  <>
                    {/* Incrementor/Decrementor */}
                    <div style={{ display: 'flex', alignItems: 'center', background: '#F1F5F9', borderRadius: '10px', padding: '2px' }}>
                      <button 
                        style={{ width: '26px', height: '26px', border: 'none', background: 'none', fontSize: '16px', fontWeight: 800, cursor: 'pointer' }}
                        onClick={() => updateFishCount(fish.id, Math.max(1, fish.count - 1))}
                      >
                        -
                      </button>
                      <span style={{ width: '24px', textAlign: 'center', fontSize: '13px', fontWeight: 700 }}>{fish.count}</span>
                      <button 
                        style={{ width: '26px', height: '26px', border: 'none', background: 'none', fontSize: '16px', fontWeight: 800, cursor: 'pointer' }}
                        onClick={() => updateFishCount(fish.id, fish.count + 1)}
                      >
                        +
                      </button>
                    </div>

                    {/* Trash delete */}
                    <button 
                      aria-label="Delete fish entry"
                      style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', display: 'flex', padding: '4px' }}
                      onClick={() => setFishToDelete(fish.id)}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-critical)')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      </div>

      {/* Delete Confirmation Modal */}
      {fishToDelete && (
        <div className="modal-overlay" onClick={() => setFishToDelete(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Delete Fish Entry</h3>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
              Are you sure you want to delete this fish entry? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                className="secondary-button"
                style={{ padding: '10px 20px', fontSize: '14px' }}
                onClick={() => setFishToDelete(null)}
              >
                Cancel
              </button>
              <button 
                className="primary-button"
                style={{ 
                  padding: '10px 20px', 
                  fontSize: '14px', 
                  backgroundColor: 'var(--color-critical)',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)'
                }}
                onClick={() => {
                  if (fishToDelete) {
                    removeFish(fishToDelete);
                    setFishToDelete(null);
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
