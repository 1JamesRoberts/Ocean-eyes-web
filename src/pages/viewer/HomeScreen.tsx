import React, { useState } from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { useTank } from '../../hooks/useTank';
import { useReadings } from '../../hooks/useReadings';
import { useFish } from '../../hooks/useFish';
import { useAlerts } from '../../hooks/useAlerts';
import { useLiveState } from '../../hooks/useLiveState';
import { TankHeader } from '../../components/home/TankHeader';
import { HealthScoreCard } from '../../components/home/HealthScoreCard';
import { LiveFeedPreview } from '../../components/home/LiveFeedPreview';
import { FishInventorySummary } from '../../components/home/FishInventorySummary';
import { WaterClarityCard } from '../../components/home/WaterClarityCard';
import { WaterChemistryGrid } from '../../components/home/WaterChemistryGrid';
import { ActiveAlertsList } from '../../components/home/ActiveAlertsList';
import { AddTankModal } from '../../components/home/AddTankModal';

export const HomeScreen: React.FC = () => {
  const { setActiveTab, setSelectedAlertId } = useNavigation();
  const { activeTank, tanks, linkedTanks, tankId, selectTank, createAndLinkTank, linkTank } = useTank();
  const { readings } = useReadings();
  const { fishList } = useFish(tankId);
  const { alerts } = useAlerts();
  const { liveState } = useLiveState(tankId);

  const [showAddTankModal, setShowAddTankModal] = useState(false);

  const latestReading = readings[0] || {
    clarity: 1.2,
    fish_count: 0,
    ph: 7.2,
    temp: 26.1,
    ammonia: 0,
    nitrite: 0.1
  };

  const displayClarity = liveState?.is_live 
    ? (liveState.feeds.find(f => f.id === liveState.selected_feed_id)?.current_clarity ?? latestReading.clarity)
    : latestReading.clarity;
  
  const displayFishCount = liveState?.is_live
    ? (liveState.feeds.find(f => f.id === liveState.selected_feed_id)?.current_fish_count ?? latestReading.fish_count)
    : latestReading.fish_count;

  const activeAlertCount = alerts.filter(a => !a.resolved).length;

  const handleSelectAlert = (alertId: string) => {
    setSelectedAlertId(alertId);
    setActiveTab('settings');
  };

  const handleCreateTank = async (name: string) => {
    await createAndLinkTank(name);
  };

  const handleLinkTank = async (tankId: string): Promise<boolean> => {
    return await linkTank(tankId);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
              liveState={liveState}
              displayClarity={displayClarity}
              displayFishCount={displayFishCount}
              onViewAdvanced={() => setActiveTab('live')}
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

      <AddTankModal
        show={showAddTankModal}
        onClose={() => setShowAddTankModal(false)}
        onCreateTank={handleCreateTank}
        onLinkTank={handleLinkTank}
      />
    </div>
  );
};
