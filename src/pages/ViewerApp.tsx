// ViewerApp.tsx - Recreating Flutter UI screens for the Mobile Viewer Portal
import React, { lazy, Suspense, useMemo } from 'react';
import { useNavigation, type ViewerTab } from '../context/NavigationContext';
import { useTank } from '../hooks/useTank';
import { useAnalytics } from '../hooks/pages/useAnalytics';
import { ScreenWithHeroVideo } from '../components/shared';
import { HeroLiveFeedSection } from '../components/home/HeroLiveFeedSection';
import { SpatialDetectionHeatmapOverlay } from '../components/analytics/SpatialDetectionHeatmapOverlay';
import { RootGateOnboarding } from './viewer/RootGateOnboarding';
import { HomeScreen } from './viewer/HomeScreen';

const LiveTuningScreen = lazy(() => import('./viewer/LiveTuningScreen').then((module) => ({ default: module.LiveTuningScreen })));
const AlertsScreen = lazy(() => import('./viewer/AlertsScreen').then((module) => ({ default: module.AlertsScreen })));
const HistoryDetailScreen = lazy(() => import('./viewer/HistoryDetailScreen').then((module) => ({ default: module.HistoryDetailScreen })));
const MyFishScreen = lazy(() => import('./viewer/MyFishScreen').then((module) => ({ default: module.MyFishScreen })));
const AnalyticsScreen = lazy(() => import('./viewer/AnalyticsScreen').then((module) => ({ default: module.AnalyticsScreen })));
const IoTMonitor = lazy(() => import('./IoTMonitor').then((module) => ({ default: module.IoTMonitor })));

const SCREENS_WITH_HERO: ViewerTab[] = ['home', 'live', 'settings', 'my_fish', 'analytics', 'alerts', 'history'];

const ScreenLoadingFallback = () => (
  <div className="flex flex-col gap-4" aria-label="Loading screen" aria-busy="true">
    <div className="h-5 w-32 animate-pulse rounded-full bg-brand/10" />
    <div className="h-40 animate-pulse rounded-4xl bg-white/35" />
    <div className="h-28 animate-pulse rounded-4xl bg-white/25" />
  </div>
);

export const ViewerApp: React.FC = () => {
  const tankId = useTank().tankId;
  const { activeTab } = useNavigation();

  // Hoisted once so the hero and AnalyticsScreen share the same selectedSpecies state
  const analyticsData = useAnalytics();

  const showHero = SCREENS_WITH_HERO.includes(activeTab);

  const analyticsHeroOverlay = useMemo(
    () => (
      <SpatialDetectionHeatmapOverlay
        records={analyticsData.heatmapRecords}
        inventorySpeciesIds={analyticsData.inventorySpeciesIds}
        selectedSpecies={analyticsData.selectedSpecies}
        onSelectedSpeciesChange={analyticsData.setSelectedSpecies}
        visible={activeTab === 'analytics'}
      />
    ),
    [
      activeTab,
      analyticsData.heatmapRecords,
      analyticsData.inventorySpeciesIds,
      analyticsData.selectedSpecies,
      analyticsData.setSelectedSpecies,
    ],
  );

  // Mounted once above routed screens so the top video element survives every tab switch.
  const defaultHero = useMemo(
    () => <HeroLiveFeedSection overlay={analyticsHeroOverlay} />,
    [analyticsHeroOverlay],
  );

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen />;
      case 'live':
      case 'settings':
        return <LiveTuningScreen />;
      case 'alerts':
        return <AlertsScreen />;
      case 'history':
        return <HistoryDetailScreen />;
      case 'monitor':
        return <IoTMonitor />;
      case 'my_fish':
        return <MyFishScreen />;
      case 'analytics':
        return <AnalyticsScreen {...analyticsData} />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      {tankId === null ? (
        <div
          data-mobile-screen-scroll
          className="-mx-4 -mt-4 flex min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))]"
        >
          <div className="
            rounded-[20px] border border-border-subtle bg-surface p-6 shadow-card
            transition-smooth
          ">
            <RootGateOnboarding />
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <ScreenWithHeroVideo hero={defaultHero} showHero={showHero}>
            <Suspense fallback={<ScreenLoadingFallback />}>
              {renderActiveScreen()}
            </Suspense>
          </ScreenWithHeroVideo>
        </div>
      )}
    </div>
  );
};
