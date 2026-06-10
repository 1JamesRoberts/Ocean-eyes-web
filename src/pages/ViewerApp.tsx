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

  return (
    <div className="flex-1 flex flex-col w-full">
      {tankId === null && activeTab !== 'live' ? <RootGateOnboarding /> : <ViewerShell />}
    </div>
  );
};

// ─── Main Shell Component (ViewerShell equivalent) ───
const ViewerShell: React.FC = () => {
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
    <div className="flex-1 flex flex-col">
      {renderActiveScreen()}
    </div>
  );
};
