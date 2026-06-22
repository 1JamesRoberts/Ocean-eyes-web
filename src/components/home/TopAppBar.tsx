import React, { useState } from 'react';
import { Search, Bell, Droplets, Plus, RotateCcw } from 'lucide-react';
import { DateTimeRangePicker } from '../analytics/DateTimeRangePicker';
import { useAnalyticsControls } from '../../context/AnalyticsControlsContext';
import type { TankBrief } from '../../types/aquarium';

interface TopAppBarProps {
  activeTank: TankBrief | undefined;
  activeTab?: string;
  onToggleAddFish?: () => void;
}

const TAB_LABELS: Record<string, { subtitle: string; title: string } | undefined> = {
  live: { subtitle: 'Camera Monitor', title: 'Live Video Stream' },
  my_fish: { subtitle: 'My Fish', title: 'Fish Inventory' },
  analytics: { subtitle: 'AI Insights', title: 'Analytics' },
  settings: { subtitle: 'Control Panel', title: 'Tank Settings' },
  alerts: { subtitle: 'Notifications', title: 'Safety Alerts' },
};

const AnalyticsCenterControls: React.FC = () => {
  const { range, setRange, loading, refetch } = useAnalyticsControls();

  return (
    <div className="flex items-center gap-3">
      <DateTimeRangePicker value={range} onChange={setRange} />
      <button
        className="
          cursor-pointer rounded-lg border border-border-card bg-transparent
          px-3 py-1.5 text-xs font-semibold text-text-muted
          hover:bg-black/5
        "
        onClick={refetch}
        disabled={loading}
        title="Refresh data"
        aria-label="Refresh analytics"
      >
        <RotateCcw size={14} />
      </button>
    </div>
  );
};

export const TopAppBar: React.FC<TopAppBarProps> = ({ activeTank, activeTab, onToggleAddFish }) => {
  const [searchValue, setSearchValue] = useState('');

  const labels = activeTab ? TAB_LABELS[activeTab] : undefined;

  return (
    <header className="
      fixed inset-x-0 top-0 z-40 flex h-20 items-center justify-between px-6
      pl-70 glass-header
      max-md:left-0 max-md:pl-6
    ">
      <div>
        {labels ? (
          <>
            <p className="text-xs text-text-muted">{labels.subtitle}</p>
            <h2 className="
              text-xl font-semibold tracking-tight text-primary-dark
            ">{labels.title}</h2>
          </>
        ) : (
          <>
            <p className="text-xs text-text-muted">Active Station: Deep Sea Station 01</p>
            <h2 className="
              text-xl font-semibold tracking-tight text-primary-dark
            ">
              {activeTank?.name || 'Living Room Reef'}
            </h2>
          </>
        )}
      </div>

      {activeTab === 'analytics' && (
        <div className="
          absolute left-1/2 hidden -translate-x-1/2
          md:block
        ">
          <AnalyticsCenterControls />
        </div>
      )}

      <div className="flex items-center gap-5">
        <div className="
          group relative hidden
          md:block
        ">
          <span className="
            absolute inset-y-0 left-3 flex items-center text-on-surface-variant
          ">
            <Search size={18} />
          </span>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search analytics..."
            className="
              w-64 rounded-full border border-white/30 bg-white/40 py-2 pr-4
              pl-10 text-sm text-on-surface backdrop-blur-sm transition-all
              outline-none
              focus:ring-2 focus:ring-secondary-container
            "
          />
        </div>

        <div className="flex gap-1">
          {activeTab === 'my_fish' && (
            <button
              type="button"
              className="
                rounded-xl p-2 text-on-surface-variant transition-opacity
                hover:bg-white/20 hover:text-primary-dark
              "
              aria-label="Add fish"
              onClick={onToggleAddFish}
            >
              <Plus size={20} />
            </button>
          )}
          <button
            type="button"
            className="
              rounded-xl p-2 text-on-surface-variant transition-opacity
              hover:bg-white/20 hover:text-primary-dark
            "
            aria-label="Notifications"
          >
            <Bell size={20} />
          </button>
          <button
            type="button"
            className="
              rounded-xl p-2 text-on-surface-variant transition-opacity
              hover:bg-white/20 hover:text-primary-dark
            "
            aria-label="Water readings"
          >
            <Droplets size={20} />
          </button>
        </div>

        <div className="
          flex size-10 items-center justify-center overflow-hidden rounded-full
          border-2 border-white bg-secondary-container text-sm font-bold
          text-on-secondary-container shadow-sm
        ">
          {activeTank?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
      </div>
    </header>
  );
};
