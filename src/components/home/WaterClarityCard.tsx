import React from 'react';
import { Droplet } from 'lucide-react';

interface WaterClarityCardProps {
  displayClarity: number;
  onClick: () => void;
}

export const WaterClarityCard: React.FC<WaterClarityCardProps> = ({ displayClarity, onClick }) => {
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
        <div style={{ height: '32px' }}>
          <svg width="100%" height="32" style={{ overflow: 'visible' }}>
            <polyline
              fill="none"
              stroke="var(--color-info)"
              strokeWidth="2"
              points="0,28 30,24 60,30 90,20 120,22 150,14 180,10 210,16"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
