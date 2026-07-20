import React from 'react';
import { useSettings } from '../../hooks/pages/useSettings';
import { LiveVideoSection } from '../../components/settings/LiveVideoSection';
import {
  AquariumPanelCard,
  SafetyThresholdsCard,
} from '../../components/settings/SettingsSections';
import { ScreenHeader } from '../../components/shared';
import type { CameraFilters } from '../../types/aquarium';
import type {
  AmbientCanvasDebugKey,
  AmbientCanvasDebugValues,
} from '../../hooks/live/useAmbientCanvasDebug';

interface LiveTuningScreenProps {
  tankId: string | null;
  filters: CameraFilters;
  temperatureOverlay: { backgroundColor: string; opacity: number } | null;
  tintOverlay: { backgroundColor: string; opacity: number } | null;
  onFilterChange: (partial: Partial<CameraFilters>) => void;
  showPreviewDetections: boolean;
  canvasDebugValues: AmbientCanvasDebugValues;
  onCanvasDebugChange: (key: AmbientCanvasDebugKey, value: number) => void;
  onCanvasDebugReset: () => void;
}

export const LiveTuningScreen: React.FC<LiveTuningScreenProps> = ({
  tankId,
  filters,
  temperatureOverlay,
  tintOverlay,
  onFilterChange,
  showPreviewDetections,
  canvasDebugValues,
  onCanvasDebugChange,
  onCanvasDebugReset,
}) => {
  const settings = useSettings();

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader eyebrow="Aquarium controls" />
      <section>
        <LiveVideoSection
          tankId={tankId}
          filters={filters}
          temperatureOverlay={temperatureOverlay}
          tintOverlay={tintOverlay}
          showPreviewDetections={showPreviewDetections}
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
          showConfirmUnlink={settings.showConfirmUnlink}
          onRequestUnlink={settings.onRequestUnlink}
          onCancelUnlink={settings.onCancelUnlink}
          onConfirmUnlink={settings.onConfirmUnlink}
          filters={filters}
          onFilterChange={onFilterChange}
          canvasDebug={{
            values: canvasDebugValues,
            onChange: onCanvasDebugChange,
            onReset: onCanvasDebugReset,
          }}
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
