import React, { useState } from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { useTank } from '../../hooks/useTank';
import { useReadings } from '../../hooks/useReadings';
import { useFish } from '../../hooks/useFish';
import { useAlerts } from '../../hooks/useAlerts';
import { useLiveState } from '../../hooks/useLiveState';
import { selectActiveFeedMetrics } from '../../models/services/feedMetricsService';
import type { ReadingItem, CameraFeedConfig } from '../../types/aquarium';
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
  const { fishList } = useFish(tankId);
  const { alerts } = useAlerts();
  const { liveState } = useLiveState(tankId);

  const [showAddTankModal, setShowAddTankModal] = useState(false);

  const latestReading: ReadingItem | undefined = readings[0];

  const activeFeed: CameraFeedConfig | undefined = liveState?.feeds.find(
    (f) => f.id === liveState?.selected_feed_id
  );
  const { clarity: displayClarity, fishCount: displayFishCount } = selectActiveFeedMetrics(
    liveState,
    activeFeed,
    latestReading
  );

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
        <div className="
          rounded-[20px] border border-[rgba(13,148,136,0.02)] bg-surface-card
          p-10 text-center shadow-card transition-smooth
        ">
          <span className="mb-3 block text-[32px]">🐠</span>
          <h3 className="mb-2 text-lg font-bold text-text-main">
            Waiting for monitor data…
          </h3>
          <p className="
            mx-auto max-w-[420px] text-sm leading-[150%] text-text-muted
          ">
            The AI backend has not yet returned any readings for today. Make sure the OceanEyes inference service is running and has processed at least one frame.
          </p>
        </div>
      ) : (
        <div className="
          grid grid-cols-[2fr_1fr] gap-6
          max-lg:grid-cols-1
        ">
          <div className="flex flex-col gap-6">
            <HealthScoreCard
              reading={{
                ph: latestReading.ph,
                clarity: displayClarity,
                ammonia: latestReading.ammonia,
                nitrite: latestReading.nitrite
              }}
            />

            <div className="flex flex-col gap-6">
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

          <div className="flex flex-col gap-6">
            <WaterClarityCard
              displayClarity={displayClarity}
              readings={readings}
              onClick={() => setActiveTab('history')}
            />

            <div>
              <h3 className="mb-3 text-base font-bold text-text-main">
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
