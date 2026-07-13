import React from 'react';
import { ChevronRight, FlaskConical, Radio } from 'lucide-react';
import { useHome } from '../../hooks/pages/useHome';
import { CardSectionHeader, ScreenHeader, ScreenState } from '../../components/shared';
import { HealthScoreCard } from '../../components/home/HealthScoreCard';
import { FishInventorySummary } from '../../components/home/FishInventorySummary';
import { WaterChemistryGrid } from '../../components/home/WaterChemistryGrid';
import { ActiveAlertsList } from '../../components/home/ActiveAlertsList';

export const HomeScreen: React.FC = () => {
  const {
    fishList,
    latestReading,
    displayClarity,
    hasReadingData,
    alerts,
    onManageFish,
    onViewHistory,
    onSelectAlert,
  } = useHome();

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader eyebrow="Aquarium overview" />
      {!hasReadingData ? (
        <div className="glass-card">
          <ScreenState
            icon={Radio}
            title="Waiting for monitor data"
            description="OceanEyes will populate this dashboard after the inference service processes its first frame."
          />
        </div>
      ) : (
        <>
          <HealthScoreCard
            reading={{
              ph: latestReading.ph,
              temp: latestReading.temp,
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
            <CardSectionHeader
              icon={FlaskConical}
              iconClassName="text-text"
              title="Parameters"
              detail="Current water conditions"
              action={(
                <button
                  onClick={onViewHistory}
                  aria-label="View water parameter history"
                  className="cursor-pointer border-none bg-transparent p-0 transition-opacity hover:opacity-80"
                >
                  <ChevronRight size={18} className="text-[#00C3D0]" />
                </button>
              )}
            />
            <WaterChemistryGrid
              reading={latestReading}
              displayClarity={displayClarity}
              onViewHistory={onViewHistory}
            />
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
