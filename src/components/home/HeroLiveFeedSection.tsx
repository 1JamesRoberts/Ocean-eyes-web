import React from 'react';
import { useHeroLiveFeed } from '../../hooks/useHeroLiveFeed';
import { LiveFeedPreview } from './LiveFeedPreview';
import type { CameraFilters } from '../../types/aquarium';

interface HeroLiveFeedSectionProps {
  overlay?: React.ReactNode;
  filters: CameraFilters;
  temperatureOverlay: React.CSSProperties | null;
  tintOverlay: React.CSSProperties | null;
}

export const HeroLiveFeedSection: React.FC<HeroLiveFeedSectionProps> = ({
  overlay,
  filters,
  temperatureOverlay,
  tintOverlay,
}) => {
  const {
    activeTank,
    displayClarity,
    displayFishCount,
    onViewAdvanced,
    onGoLive,
  } = useHeroLiveFeed();

  return (
    <LiveFeedPreview
      activeTank={activeTank}
      displayClarity={displayClarity}
      displayFishCount={displayFishCount}
      onViewAdvanced={onViewAdvanced}
      onGoFullscreen={onGoLive}
      overlay={overlay}
      filters={filters}
      temperatureOverlay={temperatureOverlay}
      tintOverlay={tintOverlay}
      hero
    />
  );
};
