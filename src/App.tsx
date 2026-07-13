// App.tsx - Phone-aspect OceanEyes dashboard coordinator
import React, { useLayoutEffect } from 'react';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { LiveFeedProvider } from './context/LiveFeedContext';
import { AnalyticsControlsProvider } from './context/AnalyticsControlsContext';
import { PhoneFrame, PillNavigation } from './components/shared';
import { ViewerApp } from './pages/ViewerApp';
import { useTank } from './hooks/useTank';

export const OceanEyesDashboard: React.FC = () => {
  const { activeTab } = useNavigation();
  const { tankId } = useTank();

  // All tab screens share the stationary screen scroll container, so reset it when
  // the destination changes instead of carrying the previous screen's position.
  useLayoutEffect(() => {
    document.querySelector<HTMLElement>('[data-mobile-screen-scroll]')?.scrollTo(0, 0);
  }, [activeTab]);

  return (
    <PhoneFrame navigation={<PillNavigation />}>
      <main
        id="main-content"
        className="flex min-h-0 flex-1 flex-col gap-4 px-4 pt-4"
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
