import React, { useState } from 'react';
import { Search, Bell, Droplets } from 'lucide-react';
import type { TankBrief } from '../../types/aquarium';

interface TopAppBarProps {
  activeTank: TankBrief | undefined;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({ activeTank }) => {
  const [searchValue, setSearchValue] = useState('');

  return (
    <header className="
      fixed inset-x-0 top-0 z-40 flex h-20 items-center justify-between px-6
      pl-70 glass-header
      max-md:left-0 max-md:pl-6
    ">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-primary-dark">
          {activeTank?.name || 'Living Room Reef'}
        </h2>
        <p className="text-xs text-text-muted">Active Station: Deep Sea Station 01</p>
      </div>

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
