import React from 'react';
import { Droplet, Thermometer, Shield, Activity } from 'lucide-react';
import type { ReadingItem } from '../../types/aquarium';
import styles from './WaterChemistryGrid.module.css';

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
        <div key={param.label} className={styles.card}>
          <div
            className={styles.iconWrapper}
            style={{ backgroundColor: param.bgColor, color: param.color }}
          >
            <param.icon size={18} />
          </div>
          <div>
            <span className={styles.label}>{param.label}</span>
            <span className={param.isCritical ? styles.valueCritical : styles.value}>
              {param.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
