import React from 'react';
import { Fish } from 'lucide-react';
import { getSpeciesById, getSpeciesColor, getSpeciesInitials } from '../../data/speciesCatalog';
import type { FishEntry } from '../../types/aquarium';

interface FullscreenInventoryProps {
  fishList: FishEntry[];
  showFsInventory: boolean;
  onClose: () => void;
}

export const FullscreenInventory: React.FC<FullscreenInventoryProps> = ({
  fishList,
  showFsInventory,
  onClose
}) => {
  const totalFish = fishList.reduce((sum, f) => sum + f.count, 0);
  const totalDetected = fishList.reduce((sum, f) => sum + f.detected, 0);
  const uniqueSpecies = new Set(fishList.map(f => f.speciesId)).size;
  const detectionRate = totalFish > 0 ? Math.round((totalDetected / totalFish) * 100) : 0;

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      width: '320px',
      backgroundColor: 'rgba(15, 23, 42, 0.7)',
      borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
      zIndex: 30,
      display: 'flex',
      flexDirection: 'column',
      transform: showFsInventory ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      color: '#FFFFFF',
      textAlign: 'left'
    }}>
      <div style={{ padding: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#FFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Fish size={18} color="var(--color-primary)" />
          <span>Fish Inventory</span>
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.6)',
            cursor: 'pointer',
            fontSize: '20px',
            padding: '4px',
            lineHeight: 1
          }}
        >
          ×
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: '8px', padding: '8px 12px' }}>
          <span style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.5)', display: 'block', fontWeight: 600 }}>TOTAL FISH</span>
          <strong style={{ fontSize: '15px', color: '#FFF' }}>{totalFish}</strong>
        </div>
        <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: '8px', padding: '8px 12px' }}>
          <span style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.5)', display: 'block', fontWeight: 600 }}>SPECIES</span>
          <strong style={{ fontSize: '15px', color: '#FFF' }}>{uniqueSpecies}</strong>
        </div>
        <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: '8px', padding: '8px 12px' }}>
          <span style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.5)', display: 'block', fontWeight: 600 }}>DETECTED</span>
          <strong style={{ fontSize: '15px', color: 'var(--color-good)' }}>{totalDetected}</strong>
        </div>
        <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: '8px', padding: '8px 12px' }}>
          <span style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.5)', display: 'block', fontWeight: 600 }}>DETECTION</span>
          <strong style={{ fontSize: '15px', color: 'var(--color-warning)' }}>{detectionRate}%</strong>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {fishList.map(fish => {
          const species = getSpeciesById(fish.speciesId);
          const display = species ? {
            initials: species.initials,
            color: species.color,
            name: species.displayName
          } : {
            initials: getSpeciesInitials(fish.speciesId),
            color: getSpeciesColor(fish.speciesId),
            name: fish.name
          };
          const visibilityPercent = fish.count > 0 ? Math.round((fish.detected / fish.count) * 100) : 0;
          const barColor = visibilityPercent >= 80 ? '#16A34A' : visibilityPercent >= 50 ? '#D97706' : '#DC2626';
          const radius = 12;
          const circumference = 2 * Math.PI * radius;
          const dashLength = (circumference * visibilityPercent) / 100;
          const gapLength = circumference - dashLength;

          return (
            <div
              key={fish.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.03)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: display.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#fff',
                  flexShrink: 0
                }}>
                  {display.initials}
                </div>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{display.name}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="28" height="28" viewBox="0 0 28 28">
                  <circle
                    cx="14"
                    cy="14"
                    r={radius}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="14"
                    cy="14"
                    r={radius}
                    fill="none"
                    stroke={barColor}
                    strokeWidth="3"
                    strokeDasharray={`${dashLength} ${gapLength}`}
                    strokeLinecap="round"
                    transform="rotate(-90 14 14)"
                  />
                </svg>
                <span style={{ fontSize: '11px', fontWeight: 700, color: barColor }}>{visibilityPercent}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
