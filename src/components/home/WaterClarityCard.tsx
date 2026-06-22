import React from 'react';
import { Droplet } from 'lucide-react';
import { DashboardCard } from '../shared/DashboardCard';
import type { ReadingItem } from '../../types/aquarium';

interface WaterClarityCardProps {
  displayClarity: number;
  readings: ReadingItem[];
  onClick: () => void;
}

export const WaterClarityCard = React.memo<WaterClarityCardProps>(({ displayClarity, onClick }) => {
  return (
    <div>
      <h3 className="mb-2 text-base font-bold text-text-main">Water Clarity</h3>

      <DashboardCard
        variant="hoverable"
        padding="compact"
        className="flex w-full cursor-pointer items-center gap-2.5 text-left"
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
      </DashboardCard>
    </div>
  );
});

WaterClarityCard.displayName = 'WaterClarityCard';
