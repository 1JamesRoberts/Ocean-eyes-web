import React from 'react';
import { useSettings } from '../../hooks/pages/useSettings';
import { ChevronRight } from 'lucide-react';

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
      <div className="
        flex min-h-[75px] items-center justify-between border-b
        border-border-card pb-3
        max-xs:flex-col max-xs:items-start max-xs:gap-3
      ">
        <div>
          <span className="text-xs font-semibold text-text-muted uppercase">Control Panel</span>
          <h1 className="mt-0.5 text-display font-extrabold text-text-main">Tank Settings</h1>
        </div>
      </div>

      {/* Tank Identity */}
      <div className="
        mb-5 rounded-[20px] border border-border-subtle bg-surface-card p-5
        shadow-card transition-smooth
      ">
        {editing ? (
          <form onSubmit={handleNameChange} className="flex gap-2.5">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="
                flex-1 rounded-[10px] border border-border-card bg-surface-card
                px-3 py-2 font-main text-text-main outline-none
              "
            />
            <button className="
              inline-flex cursor-pointer items-center justify-center gap-2
              rounded-3xl border-none bg-primary-gradient px-4 py-2 font-main
              text-sm font-semibold text-text-inv shadow-primary-hover
              transition-smooth
              hover:bg-primary-hover-gradient
              active:scale-[0.98]
            " type="submit">
              Save
            </button>
          </form>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <span className="
                text-caption font-semibold text-text-muted uppercase
              ">Tank Name</span>
              <strong className="mt-0.5 block text-lg text-text-main">
                {activeTank?.name}
              </strong>
            </div>
            <button
              className="
                inline-flex cursor-pointer items-center justify-center gap-2
                rounded-xl border border-border-card bg-surface-card px-3 py-1.5
                font-main text-xs font-semibold text-text-main transition-smooth
                hover:border-text-muted hover:bg-surface-hover
              "
              onClick={onStartRename}
            >
              Rename
            </button>
          </div>
        )}

        <div className="
          mt-4 border-t border-border-card pt-4 text-xs text-text-muted
        ">
          <span>Tank Reference Code: </span>
          <code className="
            ml-1 inline-block px-1.5 py-0.5 align-middle text-caption
          ">
            {activeTank?.id}
          </code>
        </div>
      </div>

      {/* Menu Options */}
      <div className="
        mb-5 rounded-[20px] border border-border-subtle bg-surface-card px-4
        py-1 shadow-card transition-smooth
      ">
        <div
          className="
            flex cursor-pointer items-center justify-between border-b
            border-border-card py-4
          "
          onClick={onNavigateToFish}
        >
          <span className="text-h3 font-semibold">Manage Fish Inventory</span>
          <ChevronRight size={18} className="text-text-muted" />
        </div>

        <div
          className="
            flex cursor-pointer items-center justify-between border-b
            border-border-card py-4
          "
          onClick={onNavigateToHistory}
        >
          <span className="text-h3 font-semibold">Water Clarity Reports</span>
          <ChevronRight size={18} className="text-text-muted" />
        </div>

        <div
          className="
            flex cursor-pointer items-center justify-between border-b
            border-border-card py-4
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
          <span className="text-h3 font-semibold text-primary-dark">IoT Scanner Console</span>
          <ChevronRight size={18} className="text-primary-dark" />
        </div>
      </div>

      {/* Safety Threshold Settings Slider equivalent */}
      <div className="
        mb-6 rounded-[20px] border border-border-subtle bg-surface-card p-5
        shadow-card transition-smooth
      ">
        <h4 className="mb-4 text-sm font-bold text-text-main">Safety Boundaries & Notification Thresholds</h4>

        <div className="mb-4">
          <div className="mb-1.5 flex justify-between text-sm">
            <span className="text-text-muted">Maximum FNU Threshold</span>
            <strong className="text-primary-dark">{maxTurbidity} FNU</strong>
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
            className="w-full accent-primary-dark"
          />
        </div>

        <div>
          <div className="mb-1.5 flex justify-between text-sm">
            <span className="text-text-muted">Discrepancy Alarm Trigger</span>
            <strong className="text-primary-dark">{fishChangePct}% visibility</strong>
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
            className="w-full accent-primary-dark"
          />
        </div>
      </div>

      {/* Disconnect button with confirmation */}
      {showConfirmUnlink ? (
        <div className="
          flex flex-col gap-3 rounded-[20px] border border-critical
          bg-critical/5 p-5 shadow-card transition-smooth
        ">
          <strong className="text-sm text-critical">Are you sure you want to disconnect?</strong>
          <p className="m-0 text-xs leading-[140%] text-text-muted">
            This will remove "{activeTank?.name}" from your active monitoring dashboard. You can reconnect it later using the reference code: <code>{activeTank?.id}</code>.
          </p>
          <div className="mt-1 flex gap-2.5">
            <button
              className="
                inline-flex flex-1 cursor-pointer items-center justify-center
                gap-2 rounded-[10px] border border-border-card bg-surface-card
                p-2 font-main text-xs font-semibold text-text-main
                transition-smooth
                hover:border-text-muted hover:bg-surface-hover
              "
              onClick={onCancelUnlink}
            >
              Cancel
            </button>
            <button
              className="
                inline-flex flex-1 cursor-pointer items-center justify-center
                gap-2 rounded-[10px] border-none bg-critical p-2 font-main
                text-xs font-semibold text-text-inv transition-smooth
                hover:opacity-90
                active:scale-[0.98]
              "
              onClick={onConfirmUnlink}
            >
              Yes, Disconnect
            </button>
          </div>
        </div>
      ) : (
        <button
          className="
            inline-flex w-full cursor-pointer items-center justify-center gap-2
            rounded-3xl border border-critical/20 bg-surface-card px-5 py-3.5
            font-main text-sm font-semibold text-critical transition-smooth
            hover:bg-critical/5
          "
          onClick={onRequestUnlink}
        >
          Disconnect from Tank
        </button>
      )}
    </div>
  );
};
