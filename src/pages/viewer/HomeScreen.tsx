import React from 'react';
import { ChevronRight, FlaskConical } from 'lucide-react';
import { useHome } from '../../hooks/pages/useHome';
import { CardSectionHeader } from '../../components/shared';
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
          <h3 className="mb-2 type-strong">
            Waiting for monitor data…
          </h3>
          <p className="mx-auto type-caption">
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

          <div className="glass-card pt-4 px-5 pb-5">
            <CardSectionHeader
              icon={FlaskConical}
              title="Parameters"
              action={(
                <button
                  onClick={onViewHistory}
                  aria-label="View water parameter history"
                  className="cursor-pointer border-none bg-transparent p-0 transition-opacity hover:opacity-80"
                >
                  <ChevronRight size={18} className="text-brand" />
                </button>
              )}
            />
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
