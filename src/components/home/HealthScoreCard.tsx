import React from 'react';
import { getHealthColor, getHealthMessage, type HealthReading } from '../../services/healthCalculator';

interface HealthScoreCardProps {
  reading: HealthReading;
}

export const HealthScoreCard: React.FC<HealthScoreCardProps> = ({ reading }) => {
  const healthScore = calculateHealthScore(reading);
  const healthColor = getHealthColor(healthScore);
  const healthMessage = getHealthMessage(healthScore);
  const circumference = 2 * Math.PI * 38;
  const dashOffset = circumference * (1 - healthScore / 10);

  return (
    <div className="card-decoration" style={{ display: 'flex', gap: '24px', alignItems: 'center', padding: '24px' }}>
      <div style={{ position: 'relative', width: '90px', height: '90px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
        <svg style={{ position: 'absolute', transform: 'rotate(-90deg)', width: '90px', height: '90px' }}>
          <circle cx="45" cy="45" r="38" stroke="var(--color-background)" strokeWidth="8" fill="none" />
          <circle 
            cx="45" 
            cy="45" 
            r="38" 
            stroke={healthColor} 
            strokeWidth="8" 
            fill="none" 
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: 'var(--transition-smooth)' }}
          />
        </svg>
        <div style={{ textAlign: 'center', zIndex: 5 }}>
          <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-text-primary)' }}>{healthScore}</span>
          <span style={{ fontSize: '11px', display: 'block', color: 'var(--color-text-secondary)', fontWeight: 600, marginTop: '-4px' }}>Score</span>
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Aquarium Health Index</h3>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '6px', lineHeight: '145%' }}>
          {healthMessage}
        </p>
      </div>
    </div>
  );
};

function calculateHealthScore(reading: HealthReading): number {
  const score = Math.max(
    1,
    10 -
      Math.abs(7.2 - reading.ph) * 4 -
      Math.max(0, reading.clarity - 0.5) * 0.8 -
      reading.ammonia * 20 -
      reading.nitrite * 3
  );
  
  return parseFloat(score.toFixed(1));
}
