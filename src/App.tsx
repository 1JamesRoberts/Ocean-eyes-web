// App.tsx - Full-Screen Desktop Dashboard Playground Coordinator
import React from 'react';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { useTank } from './hooks/useTank';
import { useAlerts } from './hooks/useAlerts';
import { ViewerApp } from './pages/ViewerApp';
import { IoTMonitor } from './pages/IoTMonitor';
import {
  Home,
  Video,
  Settings,
  Fish,
  BarChart3
} from 'lucide-react';


const OceanEyesDashboard: React.FC = () => {
  const { activeTab, setActiveTab } = useNavigation();
  const { tankId, activeTank, tanks, linkedTanks, selectTank } = useTank();
  const { alerts } = useAlerts();
  const activeAlertCount = alerts.filter(a => !a.resolved).length;

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row">
      {/* ─── Sidebar Navigation ─── */}
      <aside className="w-[280px] bg-surface-card border-r border-border-card p-6 flex flex-col gap-8 shrink-0 max-md:w-full max-md:border-r-0 max-md:border-b max-md:p-4 max-md:gap-4">
        <div className="flex items-center gap-3">
          <div className="text-[26px] font-extrabold flex items-center gap-2">
            <img src="/logo.png" alt="" className="h-9 w-auto block" />
            <span className="bg-logo-gradient bg-clip-text text-transparent font-main tracking-tight">OceanEyes</span>
          </div>
        </div>

        {/* Navigation Sidebar Links */}
        <nav className="flex flex-col gap-2 flex-1 max-md:flex-row max-md:overflow-x-auto max-md:pb-1 max-md:gap-1.5 [&::-webkit-scrollbar]:hidden">
          <button
            className={`flex items-center gap-3 bg-none border-none font-main text-sm font-semibold py-3 px-4 rounded-xl cursor-pointer transition-[all_0.25s_cubic-bezier(0.4,0,0.2,1)] text-left w-full hover:bg-surface-hover hover:text-text-main max-md:w-auto max-md:whitespace-nowrap max-md:py-2 max-md:px-3.5 ${activeTab === 'home' ? 'bg-primary-light-gradient text-primary-dark' : 'text-text-muted'
              }`}
            onClick={() => setActiveTab('home')}
          >
            <Home size={18} />
            <span>Dashboard</span>
          </button>

          <button
            className={`flex items-center gap-3 bg-none border-none font-main text-sm font-semibold py-3 px-4 rounded-xl cursor-pointer transition-[all_0.25s_cubic-bezier(0.4,0,0.2,1)] text-left w-full hover:bg-surface-hover hover:text-text-main max-md:w-auto max-md:whitespace-nowrap max-md:py-2 max-md:px-3.5 ${activeTab === 'live' ? 'bg-primary-light-gradient text-primary-dark' : 'text-text-muted'
              }`}
            onClick={() => setActiveTab('live')}
          >
            <Video size={18} />
            <span>Live Video Feed</span>
          </button>

          <button
            className={`flex items-center gap-3 bg-none border-none font-main text-sm font-semibold py-3 px-4 rounded-xl cursor-pointer transition-[all_0.25s_cubic-bezier(0.4,0,0.2,1)] text-left w-full hover:bg-surface-hover hover:text-text-main max-md:w-auto max-md:whitespace-nowrap max-md:py-2 max-md:px-3.5 ${activeTab === 'my_fish' ? 'bg-primary-light-gradient text-primary-dark' : 'text-text-muted'
              }`}
            onClick={() => setActiveTab('my_fish')}
          >
            <Fish size={18} />
            <span>My Fish</span>
          </button>

          <button
            className={`flex items-center gap-3 bg-none border-none font-main text-sm font-semibold py-3 px-4 rounded-xl cursor-pointer transition-[all_0.25s_cubic-bezier(0.4,0,0.2,1)] text-left w-full hover:bg-surface-hover hover:text-text-main max-md:w-auto max-md:whitespace-nowrap max-md:py-2 max-md:px-3.5 ${activeTab === 'analytics' ? 'bg-primary-light-gradient text-primary-dark' : 'text-text-muted'
              }`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart3 size={18} />
            <span>Analytics</span>
          </button>

          <button
            className={`flex items-center gap-3 bg-none border-none font-main text-sm font-semibold py-3 px-4 rounded-xl cursor-pointer transition-[all_0.25s_cubic-bezier(0.4,0,0.2,1)] text-left w-full hover:bg-surface-hover hover:text-text-main max-md:w-auto max-md:whitespace-nowrap max-md:py-2 max-md:px-3.5 ${activeTab === 'settings' || activeTab === 'alerts' ? 'bg-primary-light-gradient text-primary-dark' : 'text-text-muted'
              }`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={18} />
            <span>Tank Settings</span>
            {activeAlertCount > 0 && (
              <span className="ml-auto bg-critical text-white text-[10px] py-0.5 px-1.5 rounded-full font-bold">
                {activeAlertCount}
              </span>
            )}
          </button>
        </nav>

        {/* Data Sync & Tank Selector */}
        <div className="mt-auto flex flex-col gap-3 pt-4 border-t border-border-card">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">
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
                className="w-full py-2.5 px-3 text-sm font-semibold rounded-xl border border-border-card bg-background-app text-text-main font-main cursor-pointer"
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
      <main className="flex-1 flex justify-center overflow-y-auto">
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto max-w-[1400px] w-full mx-auto p-10">
          {/* Under onboarding check */}
          {tankId === null && activeTab !== 'monitor' && activeTab !== 'live' ? (
            <div className="bg-surface-card rounded-[20px] p-10 shadow-card border border-[rgba(13,148,136,0.02)] transition-[all_0.25s_cubic-bezier(0.4,0,0.2,1)] max-w-[480px] mx-auto mt-10">
              <ViewerApp />
            </div>
          ) : activeTab === 'monitor' ? (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center pb-3 border-b border-border-card max-xs:flex-col max-xs:items-start max-xs:gap-3">
                <div>
                  <span className="text-xs text-text-muted font-semibold uppercase">Hardware Unit</span>
                  <h1 className="text-[28px] font-extrabold text-text-main">Aquarium Smart Scanner Console</h1>
                </div>
              </div>

              <div className="bg-surface-card rounded-[20px] p-2 shadow-card border border-[rgba(13,148,136,0.02)] transition-[all_0.25s_cubic-bezier(0.4,0,0.2,1)] max-w-[800px] mx-auto w-full">
                <IoTMonitor />
              </div>
            </div>
          ) : (
            <ViewerApp />
          )}
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
