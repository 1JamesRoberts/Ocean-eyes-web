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
      <h3 className="text-base font-bold text-text-main mb-3">Water Clarity</h3>

      <div 
        className="flex items-center gap-3 bg-surface-card p-4 rounded-2xl border border-[rgba(0,0,0,0.015)] shadow-card cursor-pointer transition-[all_0.25s_cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(13,148,136,0.08)]"
        onClick={onClick}
      >
        <div className="w-10 h-10 rounded-xl flex justify-center items-center shrink-0" style={{ backgroundColor: 'rgba(59, 130, 246, 0.08)', color: 'var(--color-info)' }}>
          <Droplet size={18} />
        </div>
        <div>
          <span className="text-[11px] text-text-muted block font-semibold">Clarity</span>
          <span className="text-base font-bold text-text-main">
            {displayClarity.toFixed(2)} FNU
          </span>
        </div>
      </div>
    </div>
  );
};
