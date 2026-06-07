import React from 'react';
import { Droplet, Thermometer, Shield, Activity } from 'lucide-react';
import type { ReadingItem } from '../../types/aquarium';

interface WaterChemistryGridProps {
  reading: ReadingItem;
}

export const WaterChemistryGrid: React.FC<WaterChemistryGridProps> = ({ reading }) => {
  const parameters = [
    {
      label: 'pH Value',
      value: `${reading.ph} pH`,
      color: 'var(--color-info)',
      bgColor: '#EFF6FF',
      icon: Droplet,
      isCritical: false
    },
    {
      label: 'Temperature',
      value: `${reading.temp}°C`,
      color: 'var(--color-warning)',
      bgColor: '#FFF7ED',
      icon: Thermometer,
      isCritical: false
    },
    {
      label: 'Ammonia (NH₃)',
      value: `${reading.ammonia} ppm`,
      color: 'var(--color-good)',
      bgColor: '#F0FDF4',
      icon: Shield,
      isCritical: reading.ammonia > 0
    },
    {
      label: 'Nitrite (NO₂⁻)',
      value: `${reading.nitrite} ppm`,
      color: '#8B5CF6',
      bgColor: '#FAF5FF',
      icon: Activity,
      isCritical: reading.nitrite > 0.2
    }
  ];

  return (
    <div className="chemistry-grid">
      {parameters.map(param => (
        <div 
          key={param.label}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            background: 'var(--color-surface)', 
            padding: '16px', 
            borderRadius: '16px', 
            border: '1px solid rgba(0,0,0,0.015)', 
            boxShadow: 'var(--shadow-card)' 
          }}
        >
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '12px', 
            backgroundColor: param.bgColor, 
            color: param.color, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            flexShrink: 0 
          }}>
            <param.icon size={18} />
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', fontWeight: 600 }}>{param.label}</span>
            <span style={{ 
              fontSize: '16px', 
              fontWeight: 700, 
              color: param.isCritical ? 'var(--color-critical)' : 'var(--color-text-primary)' 
            }}>
              {param.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
