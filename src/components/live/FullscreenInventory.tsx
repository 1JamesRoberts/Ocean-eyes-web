import React from 'react';
import { Fish } from 'lucide-react';
import { getSpeciesById, getSpeciesColor, getSpeciesInitials } from '../../data/speciesCatalog';
import { SpeciesAvatar } from '../fish/SpeciesAvatar';
import type { FishEntry } from '../../types/aquarium';

interface FullscreenInventoryProps {
  fishList: FishEntry[];
  showFsInventory: boolean;
  onClose: () => void;
}

export const FullscreenInventory: React.FC<FullscreenInventoryProps> = ({
  fishList,
  showFsInventory,
  onClose
}) => {
  const totalFish = fishList.reduce((sum, f) => sum + f.count, 0);
  const totalDetected = fishList.reduce((sum, f) => sum + f.detected, 0);
  const uniqueSpecies = new Set(fishList.map(f => f.speciesId)).size;
  const detectionRate = totalFish > 0 ? Math.round((totalDetected / totalFish) * 100) : 0;

  return (
    <div
      className={`
        absolute inset-y-0 right-0 z-30 flex w-[320px] flex-col border-l
        border-[rgba(255,255,255,0.1)] bg-[rgba(15,23,42,0.7)] text-left
        text-white transition-transform duration-300 ease-in-out
        ${showFsInventory ? 'translate-x-0' : 'translate-x-full'}
      `}
    >
      <div className="
        flex items-center justify-between border-b
        border-[rgba(255,255,255,0.1)] p-4
      ">
        <h3 className="m-0 flex items-center gap-2 text-h3 font-bold text-white">
          <Fish size={18} className="text-primary-dark" />
          <span>Fish Inventory</span>
        </h3>
        <button
          onClick={onClose}
          className="
            cursor-pointer border-none bg-transparent p-1 text-xl leading-none
            text-[rgba(255,255,255,0.6)]
          "
        >
          ×
        </button>
      </div>

      <div className="
        grid grid-cols-2 gap-2 border-b border-[rgba(255,255,255,0.1)] p-4
      ">
        <div className="rounded-lg bg-[rgba(255,255,255,0.04)] px-3 py-2">
          <span className="
            block text-3xs font-semibold text-[rgba(255,255,255,0.5)]
          ">TOTAL FISH</span>
          <strong className="text-h3 text-white">{totalFish}</strong>
        </div>
        <div className="rounded-lg bg-[rgba(255,255,255,0.04)] px-3 py-2">
          <span className="
            block text-3xs font-semibold text-[rgba(255,255,255,0.5)]
          ">SPECIES</span>
          <strong className="text-h3 text-white">{uniqueSpecies}</strong>
        </div>
        <div className="rounded-lg bg-[rgba(255,255,255,0.04)] px-3 py-2">
          <span className="
            block text-3xs font-semibold text-[rgba(255,255,255,0.5)]
          ">DETECTED</span>
          <strong className="text-h3 text-good">{totalDetected}</strong>
        </div>
        <div className="rounded-lg bg-[rgba(255,255,255,0.04)] px-3 py-2">
          <span className="
            block text-3xs font-semibold text-[rgba(255,255,255,0.5)]
          ">DETECTION</span>
          <strong className="text-h3 text-warning">{detectionRate}%</strong>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        {fishList.map(fish => {
          const species = getSpeciesById(fish.speciesId);
          const display = species ? {
            initials: species.initials,
            color: species.color,
            name: species.displayName
          } : {
            initials: getSpeciesInitials(fish.speciesId),
            color: getSpeciesColor(fish.speciesId),
            name: fish.name
          };
          const visibilityPercent = fish.count > 0 ? Math.round((fish.detected / fish.count) * 100) : 0;
          const barColor = visibilityPercent >= 80 ? '#16A34A' : visibilityPercent >= 50 ? '#D97706' : '#DC2626';
          const radius = 12;
          const circumference = 2 * Math.PI * radius;
          const dashLength = (circumference * visibilityPercent) / 100;
          const gapLength = circumference - dashLength;

          return (
            <div
              key={fish.id}
              className="
                flex items-center justify-between rounded-[10px]
                bg-[rgba(255,255,255,0.03)] p-2.5
              "
            >
              <div className="flex items-center gap-2.5">
                <SpeciesAvatar speciesId={fish.speciesId} radius={8} />
                <span className="text-sm font-semibold">{display.name}</span>
              </div>

              <div className="flex items-center gap-2">
                <svg width="28" height="28" viewBox="0 0 28 28">
                  <circle
                    cx="14"
                    cy="14"
                    r={radius}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="14"
                    cy="14"
                    r={radius}
                    fill="none"
                    stroke={barColor}
                    strokeWidth="3"
                    strokeDasharray={`${dashLength} ${gapLength}`}
                    strokeLinecap="round"
                    transform="rotate(-90 14 14)"
                  />
                </svg>
                <span className="text-caption font-bold" style={{ color: barColor }}>{visibilityPercent}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
