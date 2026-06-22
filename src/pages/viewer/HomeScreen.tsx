import React from 'react';
import { useHome } from '../../hooks/pages/useHome';
import { HealthScoreCard } from '../../components/home/HealthScoreCard';
import { LiveFeedPreview } from '../../components/home/LiveFeedPreview';
import { FishInventorySummary } from '../../components/home/FishInventorySummary';
import { WaterClarityCard } from '../../components/home/WaterClarityCard';
import { WaterChemistryGrid } from '../../components/home/WaterChemistryGrid';
import { ActiveAlertsList } from '../../components/home/ActiveAlertsList';

export const HomeScreen: React.FC = () => {
  const {
    activeTank,
    fishList,
    latestReading,
    displayClarity,
    displayFishCount,
    hasReadingData,
    readings,
    alerts,
    onGoLive,
    onViewAdvanced,
    onManageFish,
    onViewHistory,
    onSelectAlert,
  } = useHome();

  return (
    <div className="flex flex-col gap-6">
      {!hasReadingData ? (
        <div className="
          rounded-3xl p-10 text-center glass-card transition-smooth
        ">
          <span className="mb-3 block text-hero">🐠</span>
          <h3 className="mb-2 text-lg font-bold text-on-surface">
            Waiting for monitor data…
          </h3>
          <p className="
            mx-auto max-w-[420px] text-sm leading-[150%] text-on-surface-variant
          ">
            The AI backend has not yet returned any readings for today. Make sure the OceanEyes inference service is running and has processed at least one frame.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          <div className="
            col-span-12 flex flex-col gap-6
            lg:col-span-8
          ">
            <HealthScoreCard
              reading={{
                ph: latestReading.ph,
                clarity: displayClarity,
                ammonia: latestReading.ammonia,
                nitrite: latestReading.nitrite
              }}
            />

            <LiveFeedPreview
              activeTank={activeTank}
              displayClarity={displayClarity}
              displayFishCount={displayFishCount}
              onViewAdvanced={onViewAdvanced}
              onGoFullscreen={onGoLive}
            />

            <FishInventorySummary
              fishList={fishList}
              onManageFish={onManageFish}
            />
          </div>

          <div className="
            col-span-12 flex flex-col gap-6
            lg:col-span-4
          ">
            <WaterClarityCard
              displayClarity={displayClarity}
              readings={readings}
              onClick={onViewHistory}
            />

            <WaterChemistryGrid reading={latestReading} />

            <ActiveAlertsList
              alerts={alerts}
              onSelectAlert={onSelectAlert}
            />
          </div>
        </div>
      )}
    </div>
  );
};
