// App.tsx - Phone-aspect OceanEyes dashboard coordinator
import React, { useState } from 'react';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { AnalyticsControlsProvider } from './context/AnalyticsControlsContext';
import { PhoneFrame, StatusBar, PillNavigation } from './components/shared';
import { ViewerApp } from './pages/ViewerApp';
import { AddTankModal } from './components/home/AddTankModal';
import { useTank } from './hooks/useTank';


const OceanEyesDashboard: React.FC = () => {
  const { activeTab } = useNavigation();
  const [showAddFishForm, setShowAddFishForm] = useState(false);
  const [showAddTankModal, setShowAddTankModal] = useState(false);
  const {
    createAndLinkTank,
    linkTank,
  } = useTank();

  return (
    <PhoneFrame>
      <StatusBar />

      <div className="phone-content bg-gradient-mint">
        <main className="flex flex-1 flex-col p-4 pb-28">
          <AnalyticsControlsProvider active={activeTab === 'analytics'}>
            <ViewerApp
              showAddFishForm={showAddFishForm}
              onToggleAddFish={() => setShowAddFishForm((v) => !v)}
            />
          </AnalyticsControlsProvider>
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
