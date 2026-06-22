// ViewerApp.tsx - Recreating Flutter UI screens for the Mobile Viewer Portal
import React from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useTank } from '../hooks/useTank';
import { RootGateOnboarding } from './viewer/RootGateOnboarding';
import { HomeScreen } from './viewer/HomeScreen';
import { LiveScreen } from './viewer/LiveScreen';
import { SettingsScreen } from './viewer/SettingsScreen';
import { AlertsScreen } from './viewer/AlertsScreen';
import { HistoryDetailScreen } from './viewer/HistoryDetailScreen';
import { MyFishScreen } from './viewer/MyFishScreen';
import { AnalyticsScreen } from './viewer/AnalyticsScreen';

export const ViewerApp: React.FC = () => {
  const tankId = useTank().tankId;
  const { activeTab } = useNavigation();

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen />;
      case 'live':
        return <LiveScreen />;
      case 'settings':
        return <SettingsScreen />;
      case 'alerts':
        return <AlertsScreen />;
      case 'history':
        return <HistoryDetailScreen />;
      case 'my_fish':
        return <MyFishScreen />;
      case 'analytics':
        return <AnalyticsScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <div className="flex w-full flex-1 flex-col">
      {tankId === null && activeTab !== 'live' ? (
        <div className="
          mx-auto mt-10 max-w-[480px] rounded-[20px] border border-border-subtle
          bg-surface-card p-10 shadow-card transition-smooth
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
