import React from 'react';
import { SpeciesAvatar } from '../fish/SpeciesAvatar';
import type { FishEntry } from '../../types/aquarium';

interface FishInventorySummaryProps {
  fishList: FishEntry[];
  onManageFish: () => void;
}

export const FishInventorySummary = React.memo<FishInventorySummaryProps>(({
  fishList,
  onManageFish
}) => {
  return (
    <section className="glass-card p-6">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-brand">Top species detected</h3>
        <button
          onClick={onManageFish}
          className="
            cursor-pointer border-none bg-transparent font-main text-sm
            font-semibold text-brand-bright transition-opacity
            hover:opacity-80
          "
        >
          Manage list
        </button>
      </div>

      <div className="space-y-3">
        {fishList.slice(0, 3).map((fish) => {
          const isComplete = fish.detected === fish.count;
          return (
            <div
              key={fish.id}
              className="
                flex items-center justify-between rounded-full border
                border-white/10 bg-white/20 p-4 transition-colors
                hover:bg-white/40
              "
            >
              <div className="flex items-center gap-4">
                <div className="
                  flex size-12 items-center justify-center overflow-hidden
                  rounded-xl
                ">
                  <SpeciesAvatar speciesId={fish.speciesId} size={40} radius={8} objectFit="contain" />
                </div>
                <div>
                  <p className="font-semibold text-brand">{fish.name}</p>
                  <p className="text-xs text-text-muted">
                    Expected: {fish.count} species limit
                  </p>
                </div>
              </div>
              <span
                className="rounded-full px-3 py-1 text-xs font-bold"
                style={{
                  backgroundColor: isComplete ? 'rgba(25, 106, 89, 0.12)' : 'rgba(186, 26, 26, 0.12)',
                  color: isComplete ? 'var(--color-good)' : 'var(--color-critical)'
                }}
              >
                {isComplete ? 'All Visible' : `${fish.detected} / ${fish.count} detected`}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
});

FishInventorySummary.displayName = 'FishInventorySummary';
