import React from 'react';
import { FishSymbol, ChevronRight } from 'lucide-react';
import { SpeciesAvatar } from '../fish/SpeciesAvatar';
import { HeadedCard, ScreenState } from '../shared';
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
    <HeadedCard
      as="section"
      icon={FishSymbol}
      title="My Fish"
      action={(
          <button
            onClick={onManageFish}
            aria-label="Manage fish list"
            className="
              cursor-pointer border-none bg-transparent p-0 transition-opacity
              hover:opacity-80
            "
          >
            <ChevronRight size={18} className="text-slate-grey" />
          </button>
      )}
    >

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
                  flex items-center justify-between
                  [&:not(:last-child)]:border-b [&:not(:last-child)]:border-slate-grey/15
                "
              >
                <div className="flex items-center gap-3">
                  <div className="
                    flex size-14 items-center justify-center overflow-hidden
                    rounded-xl
                  ">
                    <SpeciesAvatar speciesId={fish.speciesId} size={56} radius={14} objectFit="contain" />
                  </div>
                  <div>
                    <p className="type-strong">{fish.name}</p>
                    <p className="type-caption">
                      {fish.detected} detected
                    </p>
                  </div>
                </div>
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-1 leading-none type-caption"
                  style={{
                    backgroundColor: isComplete
                      ? 'color-mix(in srgb, var(--role-accent-primary) 12%, transparent)'
                      : 'color-mix(in srgb, var(--color-critical) 12%, transparent)',
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
    </HeadedCard>
  );
});

FishInventorySummary.displayName = 'FishInventorySummary';
