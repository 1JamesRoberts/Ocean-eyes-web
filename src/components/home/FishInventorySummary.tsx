import React from 'react';
import { FishSymbol, ChevronRight } from 'lucide-react';
import { SpeciesAvatar } from '../fish/SpeciesAvatar';
import { CardSectionHeader, ScreenState } from '../shared';
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
    <section className="glass-card p-5 pb-4">
      <CardSectionHeader
        icon={FishSymbol}
        title="My Fish"
        detail="Your aquarium residents"
        action={(
          <button
            onClick={onManageFish}
            aria-label="Manage fish list"
            className="
              cursor-pointer border-none bg-transparent p-0 transition-opacity
              hover:opacity-80
            "
          >
            <ChevronRight size={18} className="text-text-muted" />
          </button>
        )}
      />

      <div>
        {fishList.length === 0 ? (
          <div className="rounded-2xl border border-white/20 bg-white/20">
            <ScreenState
              icon={FishSymbol}
              title="No fish added"
              description="Add your first fish to compare inventory with AI detections."
              compact
            />
          </div>
        ) : (
          fishList.slice(0, 3).map((fish) => {
            const isComplete = fish.detected === fish.count;
            return (
              <div
                key={fish.id}
                className="
                  flex items-center justify-between pb-3
                  [&:first-child]:border-t [&:first-child]:border-text-muted/15
                  [&:first-child]:pt-3
                  [&:not(:last-child)]:mb-3
                  [&:not(:last-child)]:border-b [&:not(:last-child)]:border-text-muted/15
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
                    <p className="type-strong">{fish.name}</p>
                    <p className="type-caption">
                      {fish.detected} / {fish.count} detected
                    </p>
                  </div>
                </div>
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-1 leading-none type-caption"
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
