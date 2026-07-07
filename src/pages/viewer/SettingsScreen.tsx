import React from 'react';
import { useSettings } from '../../hooks/pages/useSettings';
import { useCameraDevices } from '../../hooks/ui/useCameraDevices';
import { LiveVideoSection } from '../../components/settings/LiveVideoSection';
import {
  AIPreferencesCard,
  CameraFiltersCard,
  CameraSourceCard,
  DisconnectTankCard,
  MediaStorageCard,
  SafetyThresholdsCard,
  SettingsMenuCard,
  TankIdentityCard,
} from '../../components/settings/SettingsSections';

export const SettingsScreen: React.FC = () => {
  const settings = useSettings();
  const { devices, cameraPermissionState } = useCameraDevices();

  return (
    <div className="flex flex-col gap-6">
      <section>
        <LiveVideoSection />
      </section>

      <CameraSourceCard
        devices={devices}
        cameraPermissionState={cameraPermissionState}
        preferences={settings.preferences}
        onCameraSourceChange={settings.onCameraSourceChange}
      />

      <CameraFiltersCard
        defaultFilters={settings.preferences.defaultFilters}
        filterPresets={settings.preferences.filterPresets}
        onDeleteFilterPreset={settings.onDeleteFilterPreset}
        resetToDefaults={settings.resetToDefaults}
      />

      <AIPreferencesCard
        preferences={settings.preferences}
        onAutoConnectChange={settings.onAutoConnectChange}
        onAIPreferenceChange={settings.onAIPreferenceChange}
        onAIPreferenceCommit={settings.onAIPreferenceCommit}
      />

      <MediaStorageCard
        mediaCounts={settings.mediaCounts}
        clearSnapshots={settings.clearSnapshots}
        clearRecordings={settings.clearRecordings}
      />

      <TankIdentityCard
        activeTank={settings.activeTank}
        editing={settings.editing}
        name={settings.name}
        setName={settings.setName}
        handleNameChange={settings.handleNameChange}
        onStartRename={settings.onStartRename}
      />

      <SettingsMenuCard
        onNavigateToFish={settings.onNavigateToFish}
        onNavigateToHistory={settings.onNavigateToHistory}
        onNavigateToAlerts={settings.onNavigateToAlerts}
        onNavigateToMonitor={settings.onNavigateToMonitor}
      />

      <SafetyThresholdsCard
        maxTurbidity={settings.maxTurbidity}
        fishChangePct={settings.fishChangePct}
        onTurbidityChange={settings.onTurbidityChange}
        onTurbidityCommit={settings.onTurbidityCommit}
        onFishPctChange={settings.onFishPctChange}
        onFishPctCommit={settings.onFishPctCommit}
      />

      <DisconnectTankCard
        activeTank={settings.activeTank}
        showConfirmUnlink={settings.showConfirmUnlink}
        onRequestUnlink={settings.onRequestUnlink}
        onCancelUnlink={settings.onCancelUnlink}
        onConfirmUnlink={settings.onConfirmUnlink}
      />
    </div>
  );
};
