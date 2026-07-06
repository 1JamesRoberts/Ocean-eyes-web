import React, { useEffect, useState } from 'react';
import { useSettings } from '../../hooks/pages/useSettings';
import { LiveVideoSection } from '../../components/settings/LiveVideoSection';
import {
  ChevronRight,
  ShieldCheck,
  Video,
  Camera,
  SlidersHorizontal,
  Brain,
  FolderOpen,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { GlassCard, GlassButton, GlassInput, GlassSelect } from '../../components/shared';

export const SettingsScreen: React.FC = () => {
  const {
    activeTank,
    name,
    setName,
    editing,
    showConfirmUnlink,
    maxTurbidity,
    fishChangePct,
    handleNameChange,
    onStartRename,
    onTurbidityChange,
    onTurbidityCommit,
    onFishPctChange,
    onFishPctCommit,
    onRequestUnlink,
    onCancelUnlink,
    onConfirmUnlink,
    onCameraSourceChange,
    onDeleteFilterPreset,
    onAIPreferenceChange,
    onAIPreferenceCommit,
    onAutoConnectChange,
    preferences,
    mediaCounts,
    clearSnapshots,
    clearRecordings,
    resetToDefaults,
    onNavigateToFish,
    onNavigateToHistory,
    onNavigateToAlerts,
    onNavigateToMonitor,
  } = useSettings();

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [cameraPermissionState, setCameraPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;

    const refreshDevices = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((track) => track.stop());
        setCameraPermissionState('granted');
      } catch {
        setCameraPermissionState('denied');
      }

      try {
        const found = await navigator.mediaDevices.enumerateDevices();
        setDevices(found.filter((d) => d.kind === 'videoinput'));
      } catch {
        // ignore
      }
    };

    refreshDevices();
  }, []);

  const handleCameraSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'mock') {
      onCameraSourceChange({ type: 'mock', label: 'Mock Feed' });
      return;
    }
    const device = devices.find((d) => d.deviceId === value);
    onCameraSourceChange({
      type: 'webcam',
      deviceId: value,
      label: device?.label || 'Webcam',
    });
  };

  const cameraSourceValue =
    preferences.cameraSource.type === 'mock' ? 'mock' : preferences.cameraSource.deviceId || 'default';

  return (
    <div className="flex flex-col gap-6">
      {/* Live Video Preview */}
      <section>
        <LiveVideoSection />
      </section>

      {/* Camera Source */}
      <GlassCard className="p-5">
        <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-text">
          <Camera size={16} className="text-brand" /> Camera Source
        </h4>

        <GlassSelect
          id="camera-source"
          label="Input"
          value={cameraSourceValue}
          onChange={handleCameraSourceChange}
        >
          <option value="default">Default Webcam</option>
          {devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
            </option>
          ))}
          <option value="mock">Mock / Demo Feed</option>
        </GlassSelect>

        {cameraPermissionState === 'denied' && (
          <p className="mt-2 text-xs text-critical">
            Camera permission is denied. Enable it in your browser settings to use a real webcam.
          </p>
        )}
      </GlassCard>

      {/* Camera Filters */}
      <GlassCard className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-sm font-bold text-text">
            <SlidersHorizontal size={16} className="text-brand" /> Camera Filters
          </h4>
          <GlassButton variant="outline" size="sm" onClick={resetToDefaults}>
            <RotateCcw size={12} />
            Reset All Defaults
          </GlassButton>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-surface p-2.5">
            <span className="block text-xs text-text-muted">Contrast</span>
            <strong className="text-text">{preferences.defaultFilters.contrast}%</strong>
          </div>
          <div className="rounded-lg bg-surface p-2.5">
            <span className="block text-xs text-text-muted">Brightness</span>
            <strong className="text-text">{preferences.defaultFilters.brightness}%</strong>
          </div>
          <div className="rounded-lg bg-surface p-2.5">
            <span className="block text-xs text-text-muted">Saturation</span>
            <strong className="text-text">{preferences.defaultFilters.saturation}%</strong>
          </div>
          <div className="rounded-lg bg-surface p-2.5">
            <span className="block text-xs text-text-muted">Temperature</span>
            <strong className="text-text">{preferences.defaultFilters.temperature}</strong>
          </div>
          <div className="rounded-lg bg-surface p-2.5">
            <span className="block text-xs text-text-muted">Tint</span>
            <strong className="text-text">{preferences.defaultFilters.tint}</strong>
          </div>
        </div>

        <div>
          <h5 className="mb-2 text-xs font-semibold text-text-muted uppercase">Saved Presets</h5>
          {preferences.filterPresets.length === 0 ? (
            <p className="text-sm text-text-muted">No custom presets saved.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {preferences.filterPresets.map((preset) => (
                <div
                  key={preset.id}
                  className="
                    flex items-center gap-2 rounded-full bg-surface px-3 py-1.5
                    text-xs text-text
                  "
                >
                  <span>{preset.name}</span>
                  <button
                    onClick={() => onDeleteFilterPreset(preset.id)}
                    className="
                      cursor-pointer border-none bg-transparent p-0
                      text-critical
                    "
                    title="Delete preset"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="mt-3 text-xs text-text-muted">
          Adjust filters in the live preview above, then save the current look as a preset or as the default filter.
        </p>
      </GlassCard>

      {/* AI Preferences */}
      <GlassCard className="p-5">
        <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-text">
          <Brain size={16} className="text-brand" /> AI Preferences
        </h4>

        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-text-muted">Auto-start AI when stream connects</span>
          <button
            onClick={() => onAutoConnectChange(!preferences.autoConnect)}
            className={`
              relative inline-flex h-6 w-11 cursor-pointer rounded-full
              border-none transition-colors
              ${preferences.autoConnect ? 'bg-brand' : 'bg-surface'}
            `}
          >
            <span
              className={`
                absolute top-1 left-1 inline-block size-4 rounded-full bg-white
                transition-transform
                ${preferences.autoConnect ? 'translate-x-5' : 'translate-x-0'}
              `}
            />
          </button>
        </div>

        <div className="mb-4">
          <div className="mb-1.5 flex justify-between text-sm">
            <span className="text-text-muted">AI Polling Interval</span>
            <strong className="text-brand">{preferences.ai.pollingIntervalMs / 1000}s</strong>
          </div>
          <input
            type="range"
            min="2000"
            max="60000"
            step="1000"
            value={preferences.ai.pollingIntervalMs}
            onChange={(e) => onAIPreferenceChange({ pollingIntervalMs: parseInt(e.target.value) })}
            onMouseUp={(e) => onAIPreferenceCommit({ pollingIntervalMs: parseInt((e.target as HTMLInputElement).value) })}
            onTouchEnd={(e) => onAIPreferenceCommit({ pollingIntervalMs: parseInt((e.target as HTMLInputElement).value) })}
            className="w-full accent-brand-bright"
          />
        </div>

        <div className="mb-4">
          <div className="mb-1.5 flex justify-between text-sm">
            <span className="text-text-muted">Detection Confidence Threshold</span>
            <strong className="text-brand">{Math.round(preferences.ai.detectionConfidenceThreshold * 100)}%</strong>
          </div>
          <input
            type="range"
            min="10"
            max="90"
            step="5"
            value={Math.round(preferences.ai.detectionConfidenceThreshold * 100)}
            onChange={(e) => onAIPreferenceChange({ detectionConfidenceThreshold: parseInt(e.target.value) / 100 })}
            onMouseUp={(e) => onAIPreferenceCommit({ detectionConfidenceThreshold: parseInt((e.target as HTMLInputElement).value) / 100 })}
            onTouchEnd={(e) => onAIPreferenceCommit({ detectionConfidenceThreshold: parseInt((e.target as HTMLInputElement).value) / 100 })}
            className="w-full accent-brand-bright"
          />
        </div>

        <div className="mb-4">
          <div className="mb-1.5 flex justify-between text-sm">
            <span className="text-text-muted">Species Confidence Threshold</span>
            <strong className="text-brand">{Math.round(preferences.ai.speciesConfidenceThreshold * 100)}%</strong>
          </div>
          <input
            type="range"
            min="10"
            max="90"
            step="5"
            value={Math.round(preferences.ai.speciesConfidenceThreshold * 100)}
            onChange={(e) => onAIPreferenceChange({ speciesConfidenceThreshold: parseInt(e.target.value) / 100 })}
            onMouseUp={(e) => onAIPreferenceCommit({ speciesConfidenceThreshold: parseInt((e.target as HTMLInputElement).value) / 100 })}
            onTouchEnd={(e) => onAIPreferenceCommit({ speciesConfidenceThreshold: parseInt((e.target as HTMLInputElement).value) / 100 })}
            className="w-full accent-brand-bright"
          />
        </div>

        <div>
          <div className="mb-1.5 flex justify-between text-sm">
            <span className="text-text-muted">Diagnosis Minimum Confidence</span>
            <strong className="text-brand">{Math.round(preferences.ai.diagnosisMinConfidence * 100)}%</strong>
          </div>
          <input
            type="range"
            min="30"
            max="90"
            step="5"
            value={Math.round(preferences.ai.diagnosisMinConfidence * 100)}
            onChange={(e) => onAIPreferenceChange({ diagnosisMinConfidence: parseInt(e.target.value) / 100 })}
            onMouseUp={(e) => onAIPreferenceCommit({ diagnosisMinConfidence: parseInt((e.target as HTMLInputElement).value) / 100 })}
            onTouchEnd={(e) => onAIPreferenceCommit({ diagnosisMinConfidence: parseInt((e.target as HTMLInputElement).value) / 100 })}
            className="w-full accent-brand-bright"
          />
        </div>
      </GlassCard>

      {/* Media Storage */}
      <GlassCard className="p-5">
        <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-text">
          <FolderOpen size={16} className="text-brand" /> Media Storage
        </h4>

        <div className="
          mb-4 flex items-center justify-between rounded-lg bg-surface p-3
        ">
          <div className="flex items-center gap-3">
            <Video size={18} className="text-text-muted" />
            <div>
              <span className="block text-sm font-semibold text-text">Snapshots</span>
              <span className="text-xs text-text-muted">{mediaCounts.snapshots} saved</span>
            </div>
          </div>
          <GlassButton
            variant="outline"
            size="sm"
            onClick={clearSnapshots}
            disabled={mediaCounts.snapshots === 0}
          >
            <Trash2 size={12} />
            Clear
          </GlassButton>
        </div>

        <div className="
          flex items-center justify-between rounded-lg bg-surface p-3
        ">
          <div className="flex items-center gap-3">
            <Video size={18} className="text-text-muted" />
            <div>
              <span className="block text-sm font-semibold text-text">Recordings</span>
              <span className="text-xs text-text-muted">{mediaCounts.recordings} saved</span>
            </div>
          </div>
          <GlassButton
            variant="outline"
            size="sm"
            onClick={clearRecordings}
            disabled={mediaCounts.recordings === 0}
          >
            <Trash2 size={12} />
            Clear
          </GlassButton>
        </div>
      </GlassCard>

      {/* Tank Identity */}
      <GlassCard className="p-5">
        {editing ? (
          <form onSubmit={handleNameChange} className="flex gap-2.5">
            <GlassInput id="tank-name" value={name} onChange={e => setName(e.target.value)} />
            <GlassButton variant="primary" size="sm" type="submit">Save</GlassButton>
          </form>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <span className="
                text-caption font-semibold text-text-muted uppercase
              ">Tank Name</span>
              <strong className="mt-0.5 block text-lg text-text">
                {activeTank?.name}
              </strong>
            </div>
            <GlassButton variant="outline" size="sm" onClick={onStartRename}>Rename</GlassButton>
          </div>
        )}

        <div className="
          mt-4 border-t border-border pt-4 text-xs text-text-muted
        ">
          <span>Tank Reference Code: </span>
          <code className="
            ml-1 inline-block px-1.5 py-0.5 align-middle text-caption
          ">
            {activeTank?.id}
          </code>
        </div>
      </GlassCard>

      {/* Menu Options */}
      <GlassCard className="px-4 py-1">
        <div
          className="
            flex cursor-pointer items-center justify-between border-b
            border-border py-4
          "
          onClick={onNavigateToFish}
        >
          <span className="text-h3 font-semibold">Manage Fish Inventory</span>
          <ChevronRight size={18} className="text-text-muted" />
        </div>

        <div
          className="
            flex cursor-pointer items-center justify-between border-b
            border-border py-4
          "
          onClick={onNavigateToHistory}
        >
          <span className="text-h3 font-semibold">Water Clarity Reports</span>
          <ChevronRight size={18} className="text-text-muted" />
        </div>

        <div
          className="
            flex cursor-pointer items-center justify-between border-b
            border-border py-4
          "
          onClick={onNavigateToAlerts}
        >
          <span className="text-h3 font-semibold">Safety Alert Logs</span>
          <ChevronRight size={18} className="text-text-muted" />
        </div>

        <div
          className="flex cursor-pointer items-center justify-between py-4"
          onClick={onNavigateToMonitor}
        >
          <span className="text-h3 font-semibold text-brand">IoT Scanner Console</span>
          <ChevronRight size={18} className="text-brand" />
        </div>
      </GlassCard>

      {/* Safety Threshold Settings Slider equivalent */}
      <GlassCard className="p-5">
        <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-text"><ShieldCheck size={16} className="
          text-brand
        " /> Safety Boundaries & Notification Thresholds</h4>

        <div className="mb-4">
          <div className="mb-1.5 flex justify-between text-sm">
            <span className="text-text-muted">Maximum FNU Threshold</span>
            <strong className="text-brand">{maxTurbidity} FNU</strong>
          </div>
          <input
            type="range"
            min="1.0"
            max="10.0"
            step="0.5"
            value={maxTurbidity}
            onChange={(e) => onTurbidityChange(parseFloat(e.target.value))}
            onMouseUp={(e) => onTurbidityCommit(parseFloat((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => onTurbidityCommit(parseFloat((e.target as HTMLInputElement).value))}
            className="w-full accent-brand-bright"
          />
        </div>

        <div>
          <div className="mb-1.5 flex justify-between text-sm">
            <span className="text-text-muted">Discrepancy Alarm Trigger</span>
            <strong className="text-brand">{fishChangePct}% visibility</strong>
          </div>
          <input
            type="range"
            min="20"
            max="80"
            step="10"
            value={fishChangePct}
            onChange={(e) => onFishPctChange(parseInt(e.target.value))}
            onMouseUp={(e) => onFishPctCommit(parseInt((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => onFishPctCommit(parseInt((e.target as HTMLInputElement).value))}
            className="w-full accent-brand-bright"
          />
        </div>
      </GlassCard>

      {/* Disconnect button with confirmation */}
      {showConfirmUnlink ? (
        <GlassCard className="border-critical/30 p-5">
          <strong className="text-sm text-critical">Are you sure you want to disconnect?</strong>
          <p className="m-0 text-xs leading-[140%] text-text-muted">
            This will remove "{activeTank?.name}" from your active monitoring dashboard. You can reconnect it later using the reference code: <code>{activeTank?.id}</code>.
          </p>
          <div className="mt-1 flex gap-2.5">
            <GlassButton variant="outline" size="sm" onClick={onCancelUnlink}>Cancel</GlassButton>
            <GlassButton variant="danger" size="sm" onClick={onConfirmUnlink}>Yes, Disconnect</GlassButton>
          </div>
        </GlassCard>
      ) : (
        <GlassButton variant="outline" className="
          border-critical/20 text-critical
          hover:bg-critical/5
        " fullWidth onClick={onRequestUnlink}>
          Disconnect from Tank
        </GlassButton>
      )}
    </div>
  );
};
