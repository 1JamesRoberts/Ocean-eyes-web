import React, { useState } from 'react';
import { Search, Bell, Droplets, Plus, RotateCcw } from 'lucide-react';
import { DateTimeRangePicker } from '../analytics/DateTimeRangePicker';
import { useAnalyticsControls } from '../../context/AnalyticsControlsContext';
import { useNavigation } from '../../context/NavigationContext';
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
          cursor-pointer rounded-lg border border-border bg-transparent
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
  const { setActiveTab } = useNavigation();

  const labels = activeTab ? TAB_LABELS[activeTab] : undefined;

  return (
    <header className="
      fixed top-0 z-40 flex h-20 items-center justify-between px-6
      left-64 right-0 glass-header
      max-md:left-0 max-md:pl-6
    ">
      <div>
        {labels ? (
          <>
            <p className="text-xs text-text-muted">{labels.subtitle}</p>
            <h2 className="
              text-xl font-semibold tracking-tight text-brand
            ">{labels.title}</h2>
          </>
        ) : (
          <>
            <p className="text-xs text-text-muted">Active Station: Deep Sea Station 01</p>
            <h2 className="
              text-xl font-semibold tracking-tight text-brand
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
            absolute inset-y-0 left-3 z-10 flex items-center text-text-muted
            pointer-events-none
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
              pl-10 text-sm text-text backdrop-blur-sm transition-all
              outline-none
              focus:ring-2 focus:ring-brand-glow
            "
          />
        </div>

        <div className="flex gap-1">
          {activeTab === 'my_fish' && (
            <button
              type="button"
              className="
                flex items-center justify-center size-10 rounded-full
                text-white transition-all
                hover:opacity-90 hover:scale-105
              "
              style={{ background: 'linear-gradient(135deg, #196a59, #004349)' }}
              aria-label="Add fish"
              onClick={onToggleAddFish}
            >
              <Plus size={20} />
            </button>
          )}
          <button
            type="button"
            className="
              rounded-xl p-2 text-text-muted transition-opacity
              hover:bg-white/20 hover:text-brand
            "
            aria-label="Notifications"
            onClick={() => setActiveTab('alerts')}
          >
            <Bell size={20} />
          </button>
          <button
            type="button"
            className="
              rounded-xl p-2 text-text-muted transition-opacity
              hover:bg-white/20 hover:text-brand
            "
            aria-label="Water readings"
          >
            <Droplets size={20} />
          </button>
        </div>

        <div className="
          flex size-10 items-center justify-center overflow-hidden rounded-full
          border-2 border-white bg-brand-glow text-sm font-bold
          text-brand shadow-sm
        ">
          {activeTank?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
      </div>
    </header>
  );
};
