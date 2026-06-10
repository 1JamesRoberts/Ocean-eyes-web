import React from 'react';
import { Droplet } from 'lucide-react';
import type { ReadingItem } from '../../types/aquarium';
import { MiniClarityChart } from '../analytics/MiniClarityChart';

interface WaterClarityCardProps {
  displayClarity: number;
  readings: ReadingItem[];
  onClick: () => void;
}

export const WaterClarityCard: React.FC<WaterClarityCardProps> = ({ displayClarity, readings, onClick }) => {
  return (
    <div>
      <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '12px' }}>Water Clarity</h3>
      
      <div className="card-decoration" style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }} onClick={onClick}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '28px', fontWeight: 800 }}>{displayClarity.toFixed(2)}</span>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginLeft: '4px' }}>FNU</span>
          </div>
          <Droplet size={20} style={{ color: 'var(--color-info)', marginTop: '4px' }} />
        </div>
        <MiniClarityChart readings={readings} />
      </div>
    </div>
  );
};
