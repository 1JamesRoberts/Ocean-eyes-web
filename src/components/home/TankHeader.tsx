import React from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import type { TankBrief } from '../../types/aquarium';

interface TankHeaderProps {
  activeTank: TankBrief | undefined;
  linkedTanks: string[];
  tanks: TankBrief[];
  tankId: string | null;
  activeAlertCount: number;
  onSelectTank: (id: string) => void;
  onAddTank: () => void;
  onViewAlerts: () => void;
}

export const TankHeader: React.FC<TankHeaderProps> = ({
  activeTank,
  linkedTanks,
  tanks,
  tankId,
  activeAlertCount,
  onSelectTank,
  onAddTank,
  onViewAlerts
}) => {
  return (
    <div className="canvas-header">
      <div>
        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>My Aquarium</span>
        {linkedTanks.length > 1 ? (
          <select
            value={tankId || ''}
            onChange={(e) => {
              if (e.target.value === 'add-new-tank-action') {
                onAddTank();
                e.target.value = tankId || '';
              } else {
                onSelectTank(e.target.value);
              }
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-main)',
              fontSize: '28px',
              fontWeight: 800,
              outline: 'none',
              cursor: 'pointer',
              padding: 0,
              marginTop: '2px',
              maxWidth: '100%',
              display: 'block'
            }}
          >
            {tanks.filter(t => linkedTanks.includes(t.id)).map(t => (
              <option key={t.id} value={t.id} style={{ fontSize: '14px', fontWeight: 600, backgroundColor: 'var(--color-dropdown-bg)' }}>
                {t.name}
              </option>
            ))}
            <option value="add-new-tank-action" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)', backgroundColor: 'var(--color-dropdown-bg)' }}>
              + Add Tank...
            </option>
          </select>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 className="canvas-title" style={{ marginTop: '2px', display: 'inline-block' }}>{activeTank?.name || 'Living Room Reef'}</h1>
            <button 
              className="secondary-button" 
              style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px', borderColor: 'var(--color-primary)' }}
              onClick={onAddTank}
            >
              <Plus size={10} style={{ color: 'var(--color-primary)' }} />
              <span style={{ color: 'var(--color-primary-dark)' }}>Add Tank</span>
            </button>
          </div>
        )}
      </div>
      
      {activeAlertCount > 0 && (
        <button 
          onClick={onViewAlerts}
          style={{
            background: 'none',
            border: 'none',
            position: 'relative',
            cursor: 'pointer',
            color: 'var(--color-warning)',
            display: 'flex',
            padding: '6px'
          }}
        >
          <AlertTriangle size={24} />
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-critical)',
            border: '2px solid var(--color-surface)'
          }} />
        </button>
      )}
    </div>
  );
};
