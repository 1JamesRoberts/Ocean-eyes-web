import React from 'react';
import { useSettings } from '../../hooks/pages/useSettings';
import { useTank } from '../../hooks/useTank';
import { useCameraFilters } from '../../hooks/live/useCameraFilters';
import { LiveVideoSection } from '../../components/settings/LiveVideoSection';
import {
  AquariumPanelCard,
  SafetyThresholdsCard,
} from '../../components/settings/SettingsSections';
import { ScreenHeader } from '../../components/shared';

export const LiveTuningScreen: React.FC = () => {
  const settings = useSettings();
  const { tankId: activeTankId } = useTank();
  const tankId = activeTankId ?? null;
  const { filters, temperatureOverlay, tintOverlay, handleFilterChange } =
    useCameraFilters({ tankId });

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader eyebrow="Aquarium controls" />
      <section>
        <LiveVideoSection
          tankId={tankId}
          filters={filters}
          temperatureOverlay={temperatureOverlay}
          tintOverlay={tintOverlay}
        />
      </section>

      <section className="flex flex-col gap-4">
        <AquariumPanelCard
          activeTank={settings.activeTank}
          editing={settings.editing}
          name={settings.name}
          setName={settings.setName}
          handleNameChange={settings.handleNameChange}
          onStartRename={settings.onStartRename}
          onNavigateToMonitor={settings.onNavigateToMonitor}
          showConfirmUnlink={settings.showConfirmUnlink}
          onRequestUnlink={settings.onRequestUnlink}
          onCancelUnlink={settings.onCancelUnlink}
          onConfirmUnlink={settings.onConfirmUnlink}
          filters={filters}
          onFilterChange={handleFilterChange}
        />

        <SafetyThresholdsCard
          maxTurbidity={settings.maxTurbidity}
          fishChangePct={settings.fishChangePct}
          onNavigateToAlerts={settings.onNavigateToAlerts}
          onTurbidityChange={settings.onTurbidityChange}
          onTurbidityCommit={settings.onTurbidityCommit}
          onFishPctChange={settings.onFishPctChange}
          onFishPctCommit={settings.onFishPctCommit}
          preferences={settings.preferences}
          onAutoConnectChange={settings.onAutoConnectChange}
          onAIPreferenceChange={settings.onAIPreferenceChange}
          onAIPreferenceCommit={settings.onAIPreferenceCommit}
        />
      </section>
    </div>
  );
};
