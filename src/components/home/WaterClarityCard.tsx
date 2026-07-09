import React from 'react';
import { Droplets } from 'lucide-react';
import type { ReadingItem } from '../../types/aquarium';

interface WaterClarityCardProps {
  displayClarity: number;
  readings: ReadingItem[];
  onClick: () => void;
  compact?: boolean;
}

export const WaterClarityCard = React.memo<WaterClarityCardProps>(({ displayClarity, onClick, compact = false }) => {
  if (compact) {
    return (
      <button
        type="button"
        className="
          flex w-full cursor-pointer items-center gap-4 rounded-2xl border
          border-white/20 bg-white/20 p-3 text-left transition-colors
          hover:bg-white/60
        "
        onClick={onClick}
      >
        <div className="
          flex size-10 shrink-0 items-center justify-center rounded-full
          bg-brand/10 text-brand
        ">
          <span className="material-symbols-outlined text-base">water_drop</span>
        </div>
        <div className="flex-1">
          <span className="block type-caption">Clarity</span>
          <span className="type-title text-brand">
            {displayClarity.toFixed(2)} FNU
          </span>
        </div>
      </button>
    );
  }

  return (
    <section className="glass-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <Droplets size={16} strokeWidth={2.5} className="text-brand" />
        <h3 className="type-title">
          Water Clarity
        </h3>
      </div>

      <button
        type="button"
        className="
          flex w-full cursor-pointer items-center gap-4 rounded-2xl border
          border-white/20 bg-white/20 p-4 text-left transition-colors
          hover:bg-white/60
        "
        onClick={onClick}
      >
        <div className="
          flex size-12 shrink-0 items-center justify-center rounded-full
          bg-brand/10 text-brand
        ">
          <span className="material-symbols-outlined">water_drop</span>
        </div>
        <div>
          <span className="block type-caption">Clarity</span>
          <span className="type-title text-brand">
            {displayClarity.toFixed(2)} FNU
          </span>
        </div>
      </button>
    </section>
  );
});

WaterClarityCard.displayName = 'WaterClarityCard';
