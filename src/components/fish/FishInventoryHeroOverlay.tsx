import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useFishMotionCanvas } from '../../hooks/fish/useFishMotionCanvas';
import { buildFishMotionScene } from '../../models/services/fishMotionScene';
import type { FishEntry } from '../../types/aquarium';
import { useHeroMediaLayer } from '../shared/HeroActionLayerContext';

interface FishInventoryHeroOverlayProps {
  fishList: readonly FishEntry[];
}

export const FishInventoryHeroOverlay = React.memo<FishInventoryHeroOverlayProps>(({
  fishList,
}) => {
  const heroMediaLayer = useHeroMediaLayer();
  const scene = useMemo(() => buildFishMotionScene(fishList), [fishList]);
  const { canvasRef, failedFishCount } = useFishMotionCanvas({
    active: heroMediaLayer !== null && scene.swimmers.length > 0,
    scene,
  });

  if (
    heroMediaLayer === null
    || (scene.swimmers.length === 0 && scene.unsupportedCount === 0)
  ) {
    return null;
  }

  const awaitingArtCount = scene.unsupportedCount + failedFishCount;

  return createPortal(
    <div
      data-fish-motion-overlay
      aria-hidden="true"
      className="
        pointer-events-none absolute inset-0 z-6 size-full overflow-hidden
      "
    >
      <div className="
        absolute inset-0 bg-linear-to-b from-turquoise/[0.035] via-transparent
        to-prussian-blue/10
      " />
      {scene.swimmers.length > 0 ? (
        <canvas
          ref={canvasRef}
          data-fish-motion-canvas
          className="absolute inset-0 size-full"
        />
      ) : null}

      {(scene.overflowCount > 0 || awaitingArtCount > 0) ? (
        <div className="
          absolute right-4 bottom-3 z-10 flex max-w-[58%] flex-wrap justify-end
          gap-1.5
        ">
          {scene.overflowCount > 0 ? (
            <span className="hero-overlay-pill min-h-7! px-2! text-2xs!">
              +{scene.overflowCount} more
            </span>
          ) : null}
          {awaitingArtCount > 0 ? (
            <span className="hero-overlay-pill min-h-7! px-2! text-2xs!">
              {awaitingArtCount} awaiting art
            </span>
          ) : null}
        </div>
      ) : null}
    </div>,
    heroMediaLayer,
  );
});

FishInventoryHeroOverlay.displayName = 'FishInventoryHeroOverlay';
