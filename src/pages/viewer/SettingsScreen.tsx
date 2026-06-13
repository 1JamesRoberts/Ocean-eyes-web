import React, { useState, useRef } from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { useTank } from '../../hooks/useTank';
import { ChevronRight } from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const { setActiveTab } = useNavigation();
  const { activeTank, unlinkTank, updateTankName, updateThresholds } = useTank();
  const [name, setName] = useState(activeTank?.name || 'Living Room Reef');
  const [editing, setEditing] = useState(false);
  const [showConfirmUnlink, setShowConfirmUnlink] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedUpdateThresholds = (clarityMin: number, fishPct: number) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      updateThresholds(clarityMin, fishPct);
    }, 300);
  };

  const flushThresholds = (clarityMin: number, fishPct: number) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = null;
    updateThresholds(clarityMin, fishPct);
  };

  const handleNameChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    updateTankName(name.trim());
    setEditing(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="
        flex min-h-[75px] items-center justify-between border-b
        border-border-card pb-3
        max-xs:flex-col max-xs:items-start max-xs:gap-3
      ">
        <div>
          <span className="text-xs font-semibold text-text-muted uppercase">Control Panel</span>
          <h1 className="mt-0.5 text-[28px] font-extrabold text-text-main">Tank Settings</h1>
        </div>
      </div>

      {/* Tank Identity */}
      <div className="
        mb-5 rounded-[20px] border border-[rgba(13,148,136,0.02)]
        bg-surface-card p-5 shadow-card transition-smooth
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
              rounded-[10px] border-none bg-primary-gradient px-4 py-2 font-main
              text-[13px] font-semibold text-text-inv
              shadow-[0_4px_12px_rgba(13,148,136,0.15)] transition-smooth
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
                text-[11px] font-semibold text-text-muted uppercase
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
              onClick={() => setEditing(true)}
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
            ml-1 inline-block px-1.5 py-0.5 align-middle text-[11px]
          ">
            {activeTank?.id}
          </code>
        </div>
      </div>

      {/* Menu Options */}
      <div className="
        mb-5 rounded-[20px] border border-[rgba(13,148,136,0.02)]
        bg-surface-card px-4 py-1 shadow-card transition-smooth
      ">
        <div
          className="
            flex cursor-pointer items-center justify-between border-b
            border-border-card py-4
          "
          onClick={() => setActiveTab('my_fish')}
        >
          <span className="text-[15px] font-semibold">Manage Fish Inventory</span>
          <ChevronRight size={18} className="text-text-muted" />
        </div>

        <div
          className="
            flex cursor-pointer items-center justify-between border-b
            border-border-card py-4
          "
          onClick={() => setActiveTab('history')}
        >
          <span className="text-[15px] font-semibold">Water Clarity Reports</span>
          <ChevronRight size={18} className="text-text-muted" />
        </div>

        <div
          className="
            flex cursor-pointer items-center justify-between border-b
            border-border-card py-4
          "
          onClick={() => setActiveTab('alerts')}
        >
          <span className="text-[15px] font-semibold">Safety Alert Logs</span>
          <ChevronRight size={18} className="text-text-muted" />
        </div>

        <div
          className="flex cursor-pointer items-center justify-between py-4"
          onClick={() => setActiveTab('monitor')}
        >
          <span className="text-[15px] font-semibold text-primary-dark">IoT Scanner Console</span>
          <ChevronRight size={18} className="text-primary-dark" />
        </div>
      </div>

      {/* Safety Threshold Settings Slider equivalent */}
      <div className="
        mb-6 rounded-[20px] border border-[rgba(13,148,136,0.02)]
        bg-surface-card p-5 shadow-card transition-smooth
      ">
        <h4 className="mb-4 text-sm font-bold text-text-main">Safety Boundaries & Notification Thresholds</h4>

        <div className="mb-4">
          <div className="mb-1.5 flex justify-between text-[13px]">
            <span className="text-text-muted">Maximum FNU Threshold</span>
            <strong className="text-primary-dark">{activeTank?.thresholds.max_turbidity_fnu || 6.0} FNU</strong>
          </div>
          <input
            type="range"
            min="1.0"
            max="10.0"
            step="0.5"
            value={activeTank?.thresholds.max_turbidity_fnu || 6.0}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              const fishPct = activeTank?.thresholds.fish_change_pct || 50.0;
              debouncedUpdateThresholds(val, fishPct);
            }}
            onMouseUp={(e) => {
              const val = parseFloat((e.target as HTMLInputElement).value);
              const fishPct = activeTank?.thresholds.fish_change_pct || 50.0;
              flushThresholds(val, fishPct);
            }}
            onTouchEnd={(e) => {
              const val = parseFloat((e.target as HTMLInputElement).value);
              const fishPct = activeTank?.thresholds.fish_change_pct || 50.0;
              flushThresholds(val, fishPct);
            }}
            className="w-full accent-primary-dark"
          />
        </div>

        <div>
          <div className="mb-1.5 flex justify-between text-[13px]">
            <span className="text-text-muted">Discrepancy Alarm Trigger</span>
            <strong className="text-primary-dark">{activeTank?.thresholds.fish_change_pct || 50.0}% visibility</strong>
          </div>
          <input
            type="range"
            min="20"
            max="80"
            step="10"
            value={activeTank?.thresholds.fish_change_pct || 50.0}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              const clar = activeTank?.thresholds.max_turbidity_fnu || 6.0;
              debouncedUpdateThresholds(clar, val);
            }}
            onMouseUp={(e) => {
              const val = parseInt((e.target as HTMLInputElement).value);
              const clar = activeTank?.thresholds.max_turbidity_fnu || 6.0;
              flushThresholds(clar, val);
            }}
            onTouchEnd={(e) => {
              const val = parseInt((e.target as HTMLInputElement).value);
              const clar = activeTank?.thresholds.max_turbidity_fnu || 6.0;
              flushThresholds(clar, val);
            }}
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
              onClick={() => setShowConfirmUnlink(false)}
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
              onClick={() => { unlinkTank(); setActiveTab('home'); }}
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
            font-main text-[14px] font-semibold text-critical transition-smooth
            hover:bg-critical/5
          "
          onClick={() => setShowConfirmUnlink(true)}
        >
          Disconnect from Tank
        </button>
      )}
    </div>
  );
};
