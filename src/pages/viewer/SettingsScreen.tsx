import React from 'react';
import { useSettings } from '../../hooks/pages/useSettings';
import { ChevronRight, ShieldCheck } from 'lucide-react';
import { GlassCard, GlassButton, GlassInput } from '../../components/shared';

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
    onNavigateToFish,
    onNavigateToHistory,
    onNavigateToAlerts,
    onNavigateToMonitor,
  } = useSettings();

  return (
    <div className="flex flex-col gap-6">
      {/* Header removed — moved to TopAppBar */}

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
        <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-text"><ShieldCheck size={16} className="text-brand" /> Safety Boundaries & Notification Thresholds</h4>

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
