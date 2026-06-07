import React from 'react';
import { Fish } from 'lucide-react';
import { getSpeciesColor, getSpeciesInitials } from '../../data/speciesCatalog';
import type { FishEntry } from '../../types/aquarium';

interface FishInventorySummaryProps {
  fishList: FishEntry[];
  displayFishCount: number;
  onManageFish: () => void;
}

export const FishInventorySummary: React.FC<FishInventorySummaryProps> = ({
  fishList,
  displayFishCount,
  onManageFish
}) => {
  const totalExpected = fishList.reduce((sum, f) => sum + f.count, 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px 24px', alignItems: 'start' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Camera Visualizer</h3>
      <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Fish Inventory Summary</span>
        <button 
          onClick={onManageFish}
          style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-main)' }}
        >
          Manage list
        </button>
      </h3>
      
      <div className="card-decoration" style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer', padding: '20px' }} onClick={onManageFish}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <span style={{ fontSize: '28px', fontWeight: 800 }}>{displayFishCount}</span>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginLeft: '4px' }}>fish visible</span>
          </div>
          <Fish size={20} color="var(--color-primary)" />
        </div>
        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
          Expected Target: {totalExpected} species count
        </span>
      </div>

      <div className="card-decoration" style={{ padding: '4px 20px' }}>
        {fishList.slice(0, 3).map((fish, idx) => (
          <div 
            key={fish.id} 
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '14px 0',
              borderBottom: idx === Math.min(2, fishList.length - 1) ? 'none' : '1px solid var(--color-border)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: getSpeciesColor(fish.speciesId),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 700,
                color: '#fff',
                flexShrink: 0,
                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
              }}>
                {getSpeciesInitials(fish.speciesId)}
              </div>
              <div>
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{fish.name}</span>
                <span style={{ fontSize: '11px', display: 'block', color: 'var(--color-text-secondary)', fontWeight: 500, marginTop: '2px' }}>
                  Expected: {fish.count} species limit
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                fontSize: '11px',
                backgroundColor: fish.detected === fish.count ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: fish.detected === fish.count ? 'var(--color-good)' : 'var(--color-critical)',
                padding: '2px 8px',
                borderRadius: '10px',
                fontWeight: 600
              }}>
                {fish.detected === fish.count ? 'All Visible' : `${fish.detected} / ${fish.count} detected`}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
