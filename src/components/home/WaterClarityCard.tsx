import React from 'react';
import { Droplet } from 'lucide-react';
import type { ReadingItem } from '../../types/aquarium';
import styles from './WaterClarityCard.module.css';

interface WaterClarityCardProps {
  displayClarity: number;
  readings: ReadingItem[];
  onClick: () => void;
}

export const WaterClarityCard: React.FC<WaterClarityCardProps> = ({ displayClarity, onClick }) => {
  return (
    <div>
      <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '12px' }}>Water Clarity</h3>

      <div className={styles.card} onClick={onClick}>
        <div className={styles.iconWrapper} style={{ backgroundColor: '#EFF6FF', color: 'var(--color-info)' }}>
          <Droplet size={18} />
        </div>
        <div>
          <span className={styles.label}>Clarity</span>
          <span className={styles.value}>
            {displayClarity.toFixed(2)} <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>FNU</span>
          </span>
        </div>
      </div>
    </div>
  );
};
