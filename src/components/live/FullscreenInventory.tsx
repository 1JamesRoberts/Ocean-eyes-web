import React from 'react';
import { X } from 'lucide-react';
import { getSpeciesById, getSpeciesInitials } from '../../data/speciesCatalog';
import DetectionVisibilityRing from '../fish/DetectionVisibilityRing';
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
  onClose,
}) => {
  const totalFish = fishList.reduce((sum, f) => sum + f.count, 0);
  const totalDetected = fishList.reduce((sum, f) => sum + f.detected, 0);
  const detectionRate = totalFish > 0 ? Math.round((totalDetected / totalFish) * 100) : 0;

  return (
    <div
      className={`
        absolute inset-y-0 right-0 z-30 flex w-[min(320px,100%)]
        flex-col overflow-hidden
        bg-black/55 text-left text-white shadow-2xl
        backdrop-blur-xl transition-transform duration-300 ease-in-out
        ${showFsInventory ? 'translate-x-0' : 'translate-x-full'}
      `}
    >
      <button
        onClick={onClose}
        type="button"
        aria-label="Close fish inventory"
        className="absolute top-5 right-3 grid size-8 cursor-pointer place-items-center rounded-full border-none bg-transparent text-white/65 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X size={17} aria-hidden="true" />
      </button>

      <div className="grid grid-cols-2 gap-8 px-5 pt-6 pb-3">
        <div>
          <span className="block type-caption-inverse">TOTAL FISH</span>
          <strong className="type-strong-inverse">{totalFish}</strong>
        </div>
        <div>
          <span className="block type-caption-inverse">DETECTION</span>
          <strong className="type-strong text-warning">{detectionRate}%</strong>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-3">
        <p className="pb-2 type-caption-inverse text-white/55 uppercase">Visibility by species</p>
        {fishList.map((fish) => {
          const species = getSpeciesById(fish.speciesId);
          const display = species
            ? {
                name: species.displayName,
              }
            : {
                name: fish.name || getSpeciesInitials(fish.speciesId),
              };
          const visibilityPercent = fish.count > 0 ? Math.round((fish.detected / fish.count) * 100) : 0;
          const isComplete = fish.detected === fish.count;

          return (
            <div
              key={fish.id}
              className="flex items-center justify-between gap-3 py-3.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid size-11 shrink-0 place-items-center overflow-hidden">
                  <SpeciesAvatar speciesId={fish.speciesId} size={38} radius={8} objectFit="contain" />
                </div>
                <div className="min-w-0">
                  <span className="block truncate type-strong-inverse">{display.name}</span>
                  <span className="mt-0.5 block type-caption-inverse text-white/55">
                    {fish.detected} / {fish.count} detected
                  </span>
                </div>
              </div>

              <div className="shrink-0">
                <DetectionVisibilityRing detected={fish.detected} expected={fish.count} size={34} strokeWidth={3} showLabel={false} />
                <span className={`mt-1 block text-center text-2xs font-semibold ${isComplete ? 'text-good' : visibilityPercent >= 50 ? 'text-warning' : 'text-critical'}`}>
                  {visibilityPercent}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
