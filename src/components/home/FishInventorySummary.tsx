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
    <div className="flex flex-col gap-3">
      <h3 className="
        m-0 flex items-center justify-between text-base font-bold text-text-main
      ">
        <span>Top species detected</span>
        <button
          onClick={onManageFish}
          className="
            cursor-pointer border-none bg-transparent font-main text-xs
            font-semibold text-primary-dark
          "
        >
          Manage list
        </button>
      </h3>

      <div className="
        rounded-[20px] border border-border-subtle bg-surface-card px-5 py-1
        shadow-card transition-smooth
        hover:-translate-y-px hover:border-[rgba(13,148,136,0.12)]
        hover:shadow-[0_8px_24px_rgba(13,148,136,0.08)]
      ">
        {fishList.slice(0, 3).map((fish, idx) => (
          <div
            key={fish.id}
            className={`
              flex items-center justify-between py-3.5
              ${idx === Math.min(2, fishList.length - 1) ? '' : `
                border-b border-border-card
              `}
            `}
          >
            <div className="flex items-center gap-3">
              <SpeciesAvatar speciesId={fish.speciesId} />
              <div>
                <span className="text-h3 font-semibold text-text-main">{fish.name}</span>
                <span className="
                  mt-0.5 block text-caption font-medium text-text-muted
                ">
                  Expected: {fish.count} species limit
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="
                rounded-[10px] px-2 py-0.5 text-caption font-semibold
              "
                style={{
                  backgroundColor: fish.detected === fish.count ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: fish.detected === fish.count ? 'var(--color-good)' : 'var(--color-critical)'
                }}
              >
                {fish.detected === fish.count ? 'All Visible' : `${fish.detected} / ${fish.count} detected`}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

FishInventorySummary.displayName = 'FishInventorySummary';
