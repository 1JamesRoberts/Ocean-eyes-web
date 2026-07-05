import React from 'react';
import { FishSymbol } from 'lucide-react';
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
    <section className="glass-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FishSymbol size={18} className="text-brand" />
          <h3 className="text-xs font-medium tracking-widest text-text-muted/70 uppercase">
            Fish Inventory
          </h3>
        </div>
        <button
          onClick={onManageFish}
          className="
            cursor-pointer border-none bg-transparent font-main text-xs
            font-semibold text-brand-bright transition-opacity
            hover:opacity-80
          "
        >
          Manage list
        </button>
      </div>

      <div className="space-y-2">
        {fishList.length === 0 ? (
          <div className="rounded-2xl border border-white/20 bg-white/20 p-4 text-center text-xs text-text-muted">
            No fish added yet.
          </div>
        ) : (
          fishList.slice(0, 3).map((fish) => {
            const isComplete = fish.detected === fish.count;
            return (
              <div
                key={fish.id}
                className="
                  flex items-center justify-between rounded-2xl border
                  border-white/10 bg-white/20 p-3 transition-colors
                  hover:bg-white/60
                "
              >
                <div className="flex items-center gap-3">
                  <div className="
                    flex size-12 items-center justify-center overflow-hidden
                    rounded-xl
                  ">
                    <SpeciesAvatar speciesId={fish.speciesId} size={40} radius={8} objectFit="contain" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand">{fish.name}</p>
                    <p className="text-[10px] text-text-muted">
                      {fish.detected} / {fish.count} detected
                    </p>
                  </div>
                </div>
                <span
                  className="rounded-full px-2.5 py-1 text-[10px] font-bold"
                  style={{
                    backgroundColor: isComplete ? 'rgba(25, 106, 89, 0.12)' : 'rgba(186, 26, 26, 0.12)',
                    color: isComplete ? 'var(--color-good)' : 'var(--color-critical)'
                  }}
                >
                  {isComplete ? 'All Visible' : `${fish.detected} / ${fish.count}`}
                </span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
});

FishInventorySummary.displayName = 'FishInventorySummary';
