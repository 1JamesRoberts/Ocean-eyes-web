// App.tsx - Phone-aspect OceanEyes dashboard coordinator
import React, { useState } from 'react';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { LiveFeedProvider } from './context/LiveFeedContext';
import { AnalyticsControlsProvider } from './context/AnalyticsControlsContext';
import { PhoneFrame, StatusBar, PillNavigation } from './components/shared';
import { ViewerApp } from './pages/ViewerApp';
import { AddTankModal } from './components/home/AddTankModal';
import { useTank } from './hooks/useTank';

const OceanEyesDashboard: React.FC = () => {
  const { activeTab } = useNavigation();
  const [showAddTankModal, setShowAddTankModal] = useState(false);
  const {
    tankId,
    createAndLinkTank,
    linkTank,
  } = useTank();

  const [showAddFishForm, setShowAddFishForm] = useState(false);

  return (
    <PhoneFrame>
      <StatusBar />

      <div className="phone-content bg-gradient-mint">
        <main className="flex flex-1 flex-col gap-4 p-4 pb-28">
          <LiveFeedProvider tankId={tankId}>
            <AnalyticsControlsProvider active={activeTab === 'analytics'}>
              <ViewerApp
                showAddFishForm={showAddFishForm}
                onToggleAddFish={() => setShowAddFishForm((v) => !v)}
              />
            </AnalyticsControlsProvider>
          </LiveFeedProvider>
        </main>
      </div>

      <PillNavigation />

      <AddTankModal
        show={showAddTankModal}
        onClose={() => setShowAddTankModal(false)}
        onCreateTank={async (name, cameraSource) => {
          await createAndLinkTank(name, cameraSource);
        }}
        onLinkTank={linkTank}
      />
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
