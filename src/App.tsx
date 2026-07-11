// App.tsx - Phone-aspect OceanEyes dashboard coordinator
import React from 'react';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { LiveFeedProvider } from './context/LiveFeedContext';
import { AnalyticsControlsProvider } from './context/AnalyticsControlsContext';
import { PhoneFrame, PillNavigation } from './components/shared';
import { ViewerApp } from './pages/ViewerApp';
import { useTank } from './hooks/useTank';

const OceanEyesDashboard: React.FC = () => {
  const { activeTab } = useNavigation();
  const { tankId } = useTank();

  return (
    <PhoneFrame navigation={<PillNavigation />}>
      <main
        id="main-content"
        className="flex flex-1 flex-col gap-4 p-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))]"
      >
        <LiveFeedProvider tankId={tankId}>
          <AnalyticsControlsProvider active={activeTab === 'analytics'}>
            <ViewerApp />
          </AnalyticsControlsProvider>
        </LiveFeedProvider>
      </main>
    </PhoneFrame>
  );
};

const App: React.FC = () => {
  return (
    <NavigationProvider>
      <OceanEyesDashboard />
    </NavigationProvider>
  );
};

export default App;
