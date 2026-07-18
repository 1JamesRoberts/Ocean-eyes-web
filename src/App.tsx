// App.tsx - Phone-aspect OceanEyes dashboard coordinator
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { LiveFeedProvider } from './context/LiveFeedContext';
import { AnalyticsControlsProvider } from './context/AnalyticsControlsContext';
import { PhoneFrame, PillNavigation } from './components/shared';
import { ViewerApp } from './pages/ViewerApp';
import { useTank } from './hooks/useTank';
import { useMockGoogleAuth } from './hooks/useMockGoogleAuth';
import { LoginScreen } from './pages/LoginScreen';

const LOGIN_EXIT_DURATION_MS = 250;

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
  const { isAuthenticated, isLoading, signInWithGoogle } = useMockGoogleAuth();
  const [showLogin, setShowLogin] = useState(() => !isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated || !showLogin) return;

    const exitTimer = window.setTimeout(() => {
      setShowLogin(false);
    }, LOGIN_EXIT_DURATION_MS);

    return () => window.clearTimeout(exitTimer);
  }, [isAuthenticated, showLogin]);

  return (
    <NavigationProvider>
      {isAuthenticated ? (
        <div className="flex min-h-0 flex-1 animate-dashboard-enter flex-col">
          <OceanEyesDashboard />
        </div>
      ) : null}
      {showLogin ? (
        <LoginScreen
          isLoading={isLoading}
          isExiting={isAuthenticated}
          onSignIn={signInWithGoogle}
        />
      ) : null}
    </NavigationProvider>
  );
};

export default App;
