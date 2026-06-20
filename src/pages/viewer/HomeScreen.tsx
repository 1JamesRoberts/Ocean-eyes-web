import React from 'react';
import { useHome } from '../../hooks/pages/useHome';
import { TankHeader } from '../../components/home/TankHeader';
import { HealthScoreCard } from '../../components/home/HealthScoreCard';
import { LiveFeedPreview } from '../../components/home/LiveFeedPreview';
import { FishInventorySummary } from '../../components/home/FishInventorySummary';
import { WaterClarityCard } from '../../components/home/WaterClarityCard';
import { WaterChemistryGrid } from '../../components/home/WaterChemistryGrid';
import { ActiveAlertsList } from '../../components/home/ActiveAlertsList';
import { AddTankModal } from '../../components/home/AddTankModal';

export const HomeScreen: React.FC = () => {
  const {
    activeTank,
    tanks,
    linkedTanks,
    tankId,
    fishList,
    latestReading,
    displayClarity,
    displayFishCount,
    activeAlertCount,
    hasReadingData,
    readings,
    alerts,
    showAddTankModal,
    selectTank,
    onViewAlerts,
    onGoLive,
    onViewAdvanced,
    onManageFish,
    onViewHistory,
    onAddTank,
    onCloseAddTankModal,
    onCreateTank,
    onLinkTank,
    onSelectAlert,
  } = useHome();

  return (
    <div className="flex flex-col gap-6">
      <TankHeader
        activeTank={activeTank}
        linkedTanks={linkedTanks}
        tanks={tanks}
        tankId={tankId}
        activeAlertCount={activeAlertCount}
        onSelectTank={selectTank}
        onAddTank={onAddTank}
        onViewAlerts={onViewAlerts}
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
                onViewAdvanced={onViewAdvanced}
                onGoFullscreen={onGoLive}
              />

              <FishInventorySummary
                fishList={fishList}
                displayFishCount={displayFishCount}
                onManageFish={onManageFish}
              />
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <WaterClarityCard
              displayClarity={displayClarity}
              readings={readings}
              onClick={onViewHistory}
            />

            <div>
              <h3 className="mb-3 text-base font-bold text-text-main">
                Water Chemistry Parameters
              </h3>
              <WaterChemistryGrid reading={latestReading} />
            </div>

            <ActiveAlertsList
              alerts={alerts}
              onSelectAlert={onSelectAlert}
            />
          </div>
        </div>
      )}

      <AddTankModal
        show={showAddTankModal}
        onClose={onCloseAddTankModal}
        onCreateTank={onCreateTank}
        onLinkTank={onLinkTank}
      />
    </div>
  );
};
