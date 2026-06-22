// App.tsx - Full-Screen Desktop Dashboard Playground Coordinator
import React from 'react';
import { NavigationProvider } from './context/NavigationContext';
import { useNavigation } from './context/NavigationContext';
import { useTank } from './hooks/useTank';
import { useAlerts } from './hooks/useAlerts';
import { ViewerApp } from './pages/ViewerApp';
import {
  Home,
  Video,
  Settings,
  Fish,
  BarChart3
} from 'lucide-react';


const NAV_ITEMS = [
  { tab: 'home' as const, icon: Home, label: 'Dashboard', isActive: (t: string) => t === 'home' },
  { tab: 'live' as const, icon: Video, label: 'Live Video Feed', isActive: (t: string) => t === 'live' },
  { tab: 'my_fish' as const, icon: Fish, label: 'My Fish', isActive: (t: string) => t === 'my_fish' },
  { tab: 'analytics' as const, icon: BarChart3, label: 'Analytics', isActive: (t: string) => t === 'analytics' },
  { tab: 'settings' as const, icon: Settings, label: 'Tank Settings', isActive: (t: string) => t === 'settings' || t === 'alerts' },
];

const OceanEyesDashboard: React.FC = () => {
  const { activeTab, setActiveTab } = useNavigation();
  const { tankId, activeTank, tanks, linkedTanks, selectTank } = useTank();
  const { alerts } = useAlerts();
  const activeAlertCount = alerts.filter(a => !a.resolved).length;

  return (
    <div className="
      flex min-h-screen w-full flex-col
      md:flex-row
    ">
      {/* ─── Sidebar Navigation ─── */}
      <aside className="
        flex w-[280px] shrink-0 flex-col gap-8 border-r border-border-card
        bg-surface-card p-6
        max-md:w-full max-md:gap-4 max-md:border-r-0 max-md:border-b max-md:p-4
      ">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-section font-extrabold">
            <img src="/logo.png" alt="" className="block h-9 w-auto" />
            <span className="
              bg-logo-gradient bg-clip-text font-main tracking-tight
              text-transparent
            ">OceanEyes</span>
          </div>
        </div>

        {/* Navigation Sidebar Links */}
        <nav className="
          flex flex-1 flex-col gap-2
          max-md:flex-row max-md:gap-1.5 max-md:overflow-x-auto max-md:pb-1
          [&::-webkit-scrollbar]:hidden
        ">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.tab}
                className={`
                  flex w-full cursor-pointer items-center gap-3 rounded-xl
                  border-none bg-none px-4 py-3 text-left font-main text-sm
                  font-semibold transition-smooth
                  hover:bg-surface-hover hover:text-text-main
                  max-md:w-auto max-md:px-3.5 max-md:py-2
                  max-md:whitespace-nowrap
                  ${item.isActive(activeTab) ? `
                    bg-primary-light-gradient text-primary-dark
                  ` : `text-text-muted`
                  }
                `}
                onClick={() => setActiveTab(item.tab)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.tab === 'settings' && activeAlertCount > 0 && (
                  <span className="
                    ml-auto rounded-full bg-critical px-1.5 py-0.5 text-2xs
                    font-bold text-white
                  ">
                    {activeAlertCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Data Sync & Tank Selector */}
        <div className="
          mt-auto flex flex-col gap-3 border-t border-border-card pt-4
        ">
          <div className="flex flex-col gap-1.5">
            <span className="
              text-2xs font-semibold tracking-wider text-text-muted uppercase
            ">
              Active Tank
            </span>
            {linkedTanks.length <= 1 ? (
              <span className="text-base font-bold text-text-main">
                {activeTank?.name ?? 'No tank linked'}
              </span>
            ) : (
              <select
                value={tankId ?? ''}
                onChange={(e) => selectTank(e.target.value || null)}
                className="
                  w-full cursor-pointer rounded-xl border border-border-card
                  bg-background-app px-3 py-2.5 font-main text-sm font-semibold
                  text-text-main
                "
              >
                {linkedTanks.map((id) => {
                  const tank = tanks.find((t) => t.id === id);
                  return (
                    <option key={id} value={id}>
                      {tank?.name ?? id}
                    </option>
                  );
                })}
              </select>
            )}
          </div>
        </div>
      </aside>

      {/* ─── Main Content Canvas ─── */}
      <main className="flex flex-1 justify-center overflow-y-auto">
        <div className="
          mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6
          overflow-y-auto p-10
        ">
          <ViewerApp />
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <NavigationProvider>
      <OceanEyesDashboard />
    </NavigationProvider>
  );
};

export default App;
