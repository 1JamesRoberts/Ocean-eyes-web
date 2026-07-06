import React from 'react';
import { useHome } from '../../hooks/pages/useHome';
import { HealthScoreCard } from '../../components/home/HealthScoreCard';
import { FishInventorySummary } from '../../components/home/FishInventorySummary';
import { WaterClarityCard } from '../../components/home/WaterClarityCard';
import { WaterChemistryGrid } from '../../components/home/WaterChemistryGrid';
import { ActiveAlertsList } from '../../components/home/ActiveAlertsList';

export const HomeScreen: React.FC = () => {
  const {
    fishList,
    latestReading,
    displayClarity,
    hasReadingData,
    readings,
    alerts,
    onManageFish,
    onViewHistory,
    onSelectAlert,
  } = useHome();

  return (
    <div className="flex flex-col gap-4">
      {!hasReadingData ? (
        <div className="glass-card p-6 text-center transition-smooth">
          <span className="mb-3 block text-4xl">🐠</span>
          <h3 className="mb-2 text-base font-bold text-text">
            Waiting for monitor data…
          </h3>
          <p className="mx-auto text-xs leading-relaxed text-text-muted">
            The AI backend has not yet returned any readings. Make sure the OceanEyes inference service is running and has processed at least one frame.
          </p>
        </div>
      ) : (
        <>
          <HealthScoreCard
            reading={{
              ph: latestReading.ph,
              clarity: displayClarity,
              ammonia: latestReading.ammonia,
              nitrite: latestReading.nitrite
            }}
          />

          <FishInventorySummary
            fishList={fishList}
            onManageFish={onManageFish}
          />

          <div className="glass-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xs font-medium tracking-widest text-text-muted/70 uppercase">
                Water Parameters
              </h3>
              <button
                onClick={onViewHistory}
                className="cursor-pointer border-none bg-transparent font-main text-xs font-semibold text-brand-bright transition-opacity hover:opacity-80"
              >
                Manage list
              </button>
            </div>
            <div className="space-y-3">
              <WaterClarityCard
                displayClarity={displayClarity}
                readings={readings}
                onClick={onViewHistory}
                compact
              />
              <WaterChemistryGrid reading={latestReading} />
            </div>
          </div>

          <ActiveAlertsList
            alerts={alerts}
            onSelectAlert={onSelectAlert}
          />
        </>
      )}
    </div>
  );
};
