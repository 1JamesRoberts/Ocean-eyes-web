import React from 'react';
import { Fish } from 'lucide-react';
import { DashboardCard } from '../shared/DashboardCard';
import { SpeciesAvatar } from '../fish/SpeciesAvatar';
import type { FishEntry } from '../../types/aquarium';

interface FishInventorySummaryProps {
  fishList: FishEntry[];
  displayFishCount: number;
  onManageFish: () => void;
}

export const FishInventorySummary = React.memo<FishInventorySummaryProps>(({
  fishList,
  displayFishCount,
  onManageFish
}) => {
  const totalExpected = fishList.reduce((sum, f) => sum + f.count, 0);

  return (
    <div className="grid grid-cols-[1fr_2fr] items-start gap-x-6 gap-y-3">
      <h3 className="m-0 text-base font-bold text-text-main">Camera Visualizer</h3>
      <h3 className="
        m-0 flex items-center justify-between text-base font-bold text-text-main
      ">
        <span>Fish Inventory Summary</span>
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

      <DashboardCard
        variant="hoverable"
        className="flex cursor-pointer flex-col"
        onClick={onManageFish}
      >
        <div className="mb-3 flex items-start justify-between">
          <div>
            <span className="text-[28px] font-extrabold">{displayFishCount}</span>
            <span className="ml-1 text-[13px] text-text-muted">fish visible</span>
          </div>
          <Fish size={20} className="text-primary-dark" />
        </div>
        <span className="text-xs text-text-muted">
          Expected Target: {totalExpected} species count
        </span>
      </DashboardCard>

      <DashboardCard variant="hoverable" padding="default" className="px-5 py-1">
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
                <span className="text-[15px] font-semibold text-text-main">{fish.name}</span>
                <span className="
                  mt-0.5 block text-[11px] font-medium text-text-muted
                ">
                  Expected: {fish.count} species limit
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className={`
                rounded-[10px] px-2 py-0.5 text-[11px] font-semibold
                ${fish.detected === fish.count
                  ? 'bg-good/10 text-good'
                  : 'bg-critical/10 text-critical'
                }
              `}>
                {fish.detected === fish.count ? 'All Visible' : `${fish.detected} / ${fish.count} detected`}
              </span>
            </div>
          </div>
        ))}
      </DashboardCard>
    </div>
  );
});

FishInventorySummary.displayName = 'FishInventorySummary';
