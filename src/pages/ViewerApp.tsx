// ViewerApp.tsx - Recreating Flutter UI screens for the Mobile Viewer Portal
import React, { useMemo } from 'react';
import { useNavigation, type ViewerTab } from '../context/NavigationContext';
import { useTank } from '../hooks/useTank';
import { useAnalytics } from '../hooks/pages/useAnalytics';
import { ScreenWithHeroVideo } from '../components/shared';
import { HeroLiveFeedSection } from '../components/home/HeroLiveFeedSection';
import { SpatialDetectionHeatmapOverlay } from '../components/analytics/SpatialDetectionHeatmapOverlay';
import { RootGateOnboarding } from './viewer/RootGateOnboarding';
import { HomeScreen } from './viewer/HomeScreen';
import { LiveTuningScreen } from './viewer/LiveTuningScreen';
import { AlertsScreen } from './viewer/AlertsScreen';
import { HistoryDetailScreen } from './viewer/HistoryDetailScreen';
import { MyFishScreen } from './viewer/MyFishScreen';
import { AnalyticsScreen } from './viewer/AnalyticsScreen';
import { IoTMonitor } from './IoTMonitor';

const SCREENS_WITH_HERO: ViewerTab[] = ['home', 'live', 'settings', 'my_fish', 'analytics', 'alerts', 'history'];

interface ViewerAppProps {
  showAddFishForm?: boolean;
  onToggleAddFish?: () => void;
}

export const ViewerApp: React.FC<ViewerAppProps> = ({ showAddFishForm, onToggleAddFish }) => {
  const tankId = useTank().tankId;
  const { activeTab } = useNavigation();

  // Hoisted once so the hero and AnalyticsScreen share the same selectedSpecies state
  const analyticsData = useAnalytics();

  const showHero = SCREENS_WITH_HERO.includes(activeTab);

  const analyticsHeroOverlay = useMemo(
    () =>
      activeTab === 'analytics' ? (
        <SpatialDetectionHeatmapOverlay
          records={analyticsData.detectionRecords}
          inventorySpeciesIds={analyticsData.inventorySpeciesIds}
          selectedSpecies={analyticsData.selectedSpecies}
          onSelectedSpeciesChange={analyticsData.setSelectedSpecies}
        />
      ) : null,
    [
      activeTab,
      analyticsData.detectionRecords,
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
        return (
          <MyFishScreen
            showAddForm={showAddFishForm}
            onToggleAddForm={onToggleAddFish}
          />
        );
      case 'analytics':
        return <AnalyticsScreen {...analyticsData} />;
      default:
        return <HomeScreen />;
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
          <ScreenWithHeroVideo hero={defaultHero} showHero={showHero}>
            {renderActiveScreen()}
          </ScreenWithHeroVideo>
        </div>
      )}
    </div>
  );
};
