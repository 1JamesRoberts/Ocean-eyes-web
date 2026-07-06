import React from 'react';
import { useHeroLiveFeed } from '../../hooks/useHeroLiveFeed';
import { LiveFeedPreview } from './LiveFeedPreview';

export const HeroLiveFeedSection: React.FC = () => {
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
      hero
    />
  );
};
