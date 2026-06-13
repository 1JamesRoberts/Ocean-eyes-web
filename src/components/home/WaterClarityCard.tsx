import React from 'react';
import { Droplet } from 'lucide-react';
import type { ReadingItem } from '../../types/aquarium';

interface WaterClarityCardProps {
  displayClarity: number;
  readings: ReadingItem[];
  onClick: () => void;
}

export const WaterClarityCard: React.FC<WaterClarityCardProps> = ({ displayClarity, onClick }) => {
  return (
    <div>
      <h3 className="mb-2 text-base font-bold text-text-main">Water Clarity</h3>

      <div 
        className="
          flex cursor-pointer items-center gap-2.5 rounded-2xl border
          border-[rgba(13,148,136,0.02)] bg-surface-card p-3 shadow-card
          transition-smooth
          hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(13,148,136,0.08)]
        "
        onClick={onClick}
      >
        <div className="
          flex size-9 shrink-0 items-center justify-center rounded-xl bg-info/8
          text-info
        ">
          <Droplet size={16} />
        </div>
        <div>
          <span className="block text-[11px] font-semibold text-text-muted">Clarity</span>
          <span className="text-base font-bold text-text-main">
            {displayClarity.toFixed(2)} FNU
          </span>
        </div>
      </div>
    </div>
  );
};
