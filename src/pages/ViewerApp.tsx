// ViewerApp.tsx - Recreating Flutter UI screens for the Mobile Viewer Portal
import React, { useMemo } from 'react';
import { useNavigation, type ViewerTab } from '../context/NavigationContext';
import { useTank } from '../hooks/useTank';
import { useAnalytics } from '../hooks/pages/useAnalytics';
import { useHeroLiveFeed } from '../hooks/useHeroLiveFeed';
import { ScreenWithHeroVideo } from '../components/shared';
import { HeroLiveFeedSection } from '../components/home/HeroLiveFeedSection';
import { HeroBadges } from '../components/home/HeroBadges';
import { SpatialDetectionHeatmap } from '../components/analytics/SpatialDetectionHeatmap';
import { RootGateOnboarding } from './viewer/RootGateOnboarding';
import { HomeScreen } from './viewer/HomeScreen';
import { SettingsScreen } from './viewer/SettingsScreen';
import { AlertsScreen } from './viewer/AlertsScreen';
import { HistoryDetailScreen } from './viewer/HistoryDetailScreen';
import { MyFishScreen } from './viewer/MyFishScreen';
import { AnalyticsScreen } from './viewer/AnalyticsScreen';

// Account is intentionally excluded — SettingsScreen already contains its own
// rich LiveVideoSection (with AI controls, filters, snapshot gallery), and
// stacking the shared hero above it would produce a duplicate video.
const SCREENS_WITH_HERO: ViewerTab[] = ['home', 'my_fish', 'analytics'];

interface ViewerAppProps {
  showAddFishForm?: boolean;
  onToggleAddFish?: () => void;
}

export const ViewerApp: React.FC<ViewerAppProps> = ({ showAddFishForm, onToggleAddFish }) => {
  const tankId = useTank().tankId;
  const { activeTab } = useNavigation();

  // Hoisted once so the hero and AnalyticsScreen share the same selectedSpecies state
  const analyticsData = useAnalytics();
  const { displayClarity, displayFishCount } = useHeroLiveFeed();

  const showHero = SCREENS_WITH_HERO.includes(activeTab);

  // Memoize the default hero (used by home, my_fish, alerts, history)
  const defaultHero = useMemo(() => <HeroLiveFeedSection />, []);

  // Memoize the analytics hero — heatmap video + species filter
  const analyticsHero = useMemo(
    () => (
      <SpatialDetectionHeatmap
        records={analyticsData.detectionRecords}
        tankId={analyticsData.tankId}
        inventorySpeciesIds={analyticsData.inventorySpeciesIds}
        selectedSpecies={analyticsData.selectedSpecies}
        onSelectedSpeciesChange={analyticsData.setSelectedSpecies}
      />
    ),
    [
      analyticsData.detectionRecords,
      analyticsData.tankId,
      analyticsData.inventorySpeciesIds,
      analyticsData.selectedSpecies,
      analyticsData.setSelectedSpecies,
    ],
  );

  // Memoize the hero badges overlay for the analytics heatmap hero
  const analyticsHeroOverlay = useMemo(
    () => <HeroBadges displayClarity={displayClarity} displayFishCount={displayFishCount} />,
    [displayClarity, displayFishCount],
  );

  const renderActiveScreen = () => {
    const hero = activeTab === 'analytics' ? analyticsHero : defaultHero;
    const heroOverlay = activeTab === 'analytics' ? analyticsHeroOverlay : undefined;

    switch (activeTab) {
      case 'home':
        return (
          <ScreenWithHeroVideo hero={hero} showHero={showHero}>
            <HomeScreen />
          </ScreenWithHeroVideo>
        );
      case 'settings':
        // SettingsScreen owns its own rich LiveVideoSection — no shared hero
        return <SettingsScreen />;
      case 'alerts':
        return (
          <ScreenWithHeroVideo hero={hero} showHero={showHero}>
            <AlertsScreen />
          </ScreenWithHeroVideo>
        );
      case 'history':
        return (
          <ScreenWithHeroVideo hero={hero} showHero={showHero}>
            <HistoryDetailScreen />
          </ScreenWithHeroVideo>
        );
      case 'my_fish':
        return (
          <ScreenWithHeroVideo hero={hero} showHero={showHero}>
            <MyFishScreen
              showAddForm={showAddFishForm}
              onToggleAddForm={onToggleAddFish}
            />
          </ScreenWithHeroVideo>
        );
      case 'analytics':
        return (
          <ScreenWithHeroVideo hero={hero} showHero={showHero} heroOverlay={heroOverlay}>
            <AnalyticsScreen {...analyticsData} />
          </ScreenWithHeroVideo>
        );
      default:
        return (
          <ScreenWithHeroVideo hero={hero} showHero={showHero}>
            <HomeScreen />
          </ScreenWithHeroVideo>
        );
    }
  };

  return (
    <div className="flex w-full flex-1 flex-col">
      {tankId === null ? (
        <div className="
          rounded-[20px] border border-border-subtle bg-surface p-6 shadow-card
          transition-smooth
        ">
          <RootGateOnboarding />
        </div>
      ) : (
        <div className="flex flex-1 flex-col">
          {renderActiveScreen()}
        </div>
      )}
    </div>
  );
};
