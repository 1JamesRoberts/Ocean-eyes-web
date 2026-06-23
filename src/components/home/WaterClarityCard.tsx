import React from 'react';
import type { ReadingItem } from '../../types/aquarium';

interface WaterClarityCardProps {
  displayClarity: number;
  readings: ReadingItem[];
  onClick: () => void;
}

export const WaterClarityCard = React.memo<WaterClarityCardProps>(({ displayClarity, onClick }) => {
  return (
    <section className="glass-card p-6">
      <h3 className="
        mb-4 text-xs font-medium tracking-widest text-text-muted/70
        uppercase
      ">
        Water Clarity
      </h3>

      <button
        type="button"
        className="
          flex w-full cursor-pointer items-center gap-4 rounded-2xl border
          border-white/20 bg-white/20 p-4 text-left transition-colors
          hover:bg-white/40
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
          <span className="block text-xs text-text-muted">Clarity</span>
          <span className="text-xl font-bold text-brand">
            {displayClarity.toFixed(2)} FNU
          </span>
        </div>
      </button>
    </section>
  );
});

WaterClarityCard.displayName = 'WaterClarityCard';
