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
    <div className="flex-1 flex flex-col w-full">
      {tankId === null && activeTab !== 'live' ? (
        <div className="bg-surface-card rounded-[20px] p-10 shadow-card border border-[rgba(13,148,136,0.02)] transition-[all_0.25s_cubic-bezier(0.4,0,0.2,1)] max-w-[480px] mx-auto mt-10">
          <RootGateOnboarding />
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {renderActiveScreen()}
        </div>
      )}
    </div>
  );
};
