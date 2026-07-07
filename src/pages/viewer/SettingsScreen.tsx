import React from 'react';
import { useSettings } from '../../hooks/pages/useSettings';
import {
  AquariumPanelCard,
  SafetyThresholdsCard,
} from '../../components/settings/SettingsSections';

export const SettingsScreen: React.FC = () => {
  const settings = useSettings();

  return (
    <div className="flex flex-col gap-6">
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
    </div>
  );
};
