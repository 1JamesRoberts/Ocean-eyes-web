import React from 'react';
import { useHeroLiveFeed } from '../../hooks/useHeroLiveFeed';
import { LiveFeedPreview } from './LiveFeedPreview';

interface HeroLiveFeedSectionProps {
  overlay?: React.ReactNode;
}

export const HeroLiveFeedSection: React.FC<HeroLiveFeedSectionProps> = ({ overlay }) => {
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
      hero
    />
  );
};
