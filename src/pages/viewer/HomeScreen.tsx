import React, { useState } from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { useTank } from '../../hooks/useTank';
import { useReadings } from '../../hooks/useReadings';
import { useFish } from '../../hooks/useFish';
import { useAlerts } from '../../hooks/useAlerts';
import { useLiveState } from '../../hooks/useLiveState';
import type { ReadingItem } from '../../types/aquarium';
import { TankHeader } from '../../components/home/TankHeader';
import { HealthScoreCard } from '../../components/home/HealthScoreCard';
import { LiveFeedPreview } from '../../components/home/LiveFeedPreview';
import { FishInventorySummary } from '../../components/home/FishInventorySummary';
import { WaterClarityCard } from '../../components/home/WaterClarityCard';
import { WaterChemistryGrid } from '../../components/home/WaterChemistryGrid';
import { ActiveAlertsList } from '../../components/home/ActiveAlertsList';
import { AddTankModal } from '../../components/home/AddTankModal';

export const HomeScreen: React.FC = () => {
  const { setActiveTab, setSelectedAlertId, setAutoFullscreen } = useNavigation();
  const { activeTank, tanks, linkedTanks, tankId, selectTank, createAndLinkTank, linkTank } = useTank();
  const { readings } = useReadings();
  const { fishList } = useFish();
  const { alerts } = useAlerts();
  const { liveState } = useLiveState(tankId);

  const [showAddTankModal, setShowAddTankModal] = useState(false);

  const latestReading: ReadingItem | undefined = readings[0];

  const displayClarity = liveState?.is_live 
    ? (liveState.feeds.find(f => f.id === liveState.selected_feed_id)?.current_clarity ?? latestReading?.clarity ?? 0)
    : (latestReading?.clarity ?? 0);
  
  const displayFishCount = liveState?.is_live
    ? (liveState.feeds.find(f => f.id === liveState.selected_feed_id)?.current_fish_count ?? latestReading?.fish_count ?? 0)
    : (latestReading?.fish_count ?? 0);

  const activeAlertCount = alerts.filter(a => !a.resolved).length;
  const hasReadingData = latestReading !== undefined;

  const handleSelectAlert = (alertId: string) => {
    setSelectedAlertId(alertId);
    setActiveTab('alerts');
  };

  const handleGoLiveFullscreen = () => {
    setAutoFullscreen(true);
    setActiveTab('live');
  };

  const handleCreateTank = async (name: string, cameraSource?: { type: 'mock' | 'webcam'; deviceId?: string }) => {
    await createAndLinkTank(name, cameraSource);
  };

  const handleLinkTank = async (tankId: string): Promise<boolean> => {
    return await linkTank(tankId);
  };

  return (
    <div className="flex flex-col gap-6">
      <TankHeader
        activeTank={activeTank}
        linkedTanks={linkedTanks}
        tanks={tanks}
        tankId={tankId}
        activeAlertCount={activeAlertCount}
        onSelectTank={selectTank}
        onAddTank={() => setShowAddTankModal(true)}
        onViewAlerts={() => setActiveTab('alerts')}
      />

      {!hasReadingData ? (
        <div className="card-decoration" style={{ padding: '40px', textAlign: 'center' }}>
          <span style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}>🐠</span>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
            Waiting for monitor data…
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', maxWidth: '420px', margin: '0 auto', lineHeight: '150%' }}>
            The AI backend has not yet returned any readings for today. Make sure the OceanEyes inference service is running and has processed at least one frame.
          </p>
        </div>
      ) : (
        <div className="dashboard-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <HealthScoreCard
              reading={{
                ph: latestReading.ph,
                clarity: displayClarity,
                ammonia: latestReading.ammonia,
                nitrite: latestReading.nitrite
              }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <LiveFeedPreview
                activeTank={activeTank}
                displayClarity={displayClarity}
                displayFishCount={displayFishCount}
                onViewAdvanced={() => setActiveTab('live')}
                onGoFullscreen={handleGoLiveFullscreen}
              />

              <FishInventorySummary
                fishList={fishList}
                displayFishCount={displayFishCount}
                onManageFish={() => setActiveTab('my_fish')}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <WaterClarityCard
              displayClarity={displayClarity}
              readings={readings}
              onClick={() => setActiveTab('history')}
            />

            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '12px' }}>
                Water Chemistry Parameters
              </h3>
              <WaterChemistryGrid reading={latestReading} />
            </div>

            <ActiveAlertsList
              alerts={alerts}
              onSelectAlert={handleSelectAlert}
            />
          </div>
        </div>
      )}

      <AddTankModal
        show={showAddTankModal}
        onClose={() => setShowAddTankModal(false)}
        onCreateTank={handleCreateTank}
        onLinkTank={handleLinkTank}
      />
    </div>
  );
};
