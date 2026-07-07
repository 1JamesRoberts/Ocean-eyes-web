import React from 'react';
import { useSettings } from '../../hooks/pages/useSettings';
import { useCameraDevices } from '../../hooks/ui/useCameraDevices';
import { LiveVideoSection } from '../../components/settings/LiveVideoSection';
import {
  AIPreferencesCard,
  CameraSourceCard,
} from '../../components/settings/SettingsSections';

export const LiveTuningScreen: React.FC = () => {
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

      <AIPreferencesCard
        preferences={settings.preferences}
        onAutoConnectChange={settings.onAutoConnectChange}
        onAIPreferenceChange={settings.onAIPreferenceChange}
        onAIPreferenceCommit={settings.onAIPreferenceCommit}
      />
    </div>
  );
};
