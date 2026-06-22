// App.tsx - Full-Screen Desktop Dashboard Playground Coordinator
import React, { useState } from 'react';
import { NavigationProvider } from './context/NavigationContext';
import { useNavigation } from './context/NavigationContext';
import { useTank } from './hooks/useTank';
import { useAlerts } from './hooks/useAlerts';
import { ViewerApp } from './pages/ViewerApp';
import { TopAppBar } from './components/home/TopAppBar';
import { AddTankModal } from './components/home/AddTankModal';
import {
  Home,
  Video,
  Settings,
  Fish,
  BarChart3,
  Plus,
  HelpCircle,
  LogOut
} from 'lucide-react';


const NAV_ITEMS = [
  { tab: 'home' as const, icon: Home, label: 'Dashboard', isActive: (t: string) => t === 'home' },
  { tab: 'live' as const, icon: Video, label: 'Live Feed', isActive: (t: string) => t === 'live' },
  { tab: 'my_fish' as const, icon: Fish, label: 'Inventory', isActive: (t: string) => t === 'my_fish' },
  { tab: 'analytics' as const, icon: BarChart3, label: 'Analytics', isActive: (t: string) => t === 'analytics' },
  { tab: 'settings' as const, icon: Settings, label: 'Settings', isActive: (t: string) => t === 'settings' || t === 'alerts' },
];

const OceanEyesDashboard: React.FC = () => {
  const { activeTab, setActiveTab } = useNavigation();
  const {
    tankId,
    activeTank,
    tanks,
    linkedTanks,
    selectTank,
    createAndLinkTank,
    linkTank
  } = useTank();
  const { alerts } = useAlerts();
  const activeAlertCount = alerts.filter(a => !a.resolved).length;

  const [showAddTankModal, setShowAddTankModal] = useState(false);

  return (
    <div className="
      flex min-h-screen w-full flex-col
      md:flex-row
    ">
      {/* ─── Sidebar Navigation ─── */}
      <aside className="
        fixed top-0 left-0 z-50 flex h-screen w-64 flex-col gap-6 p-6
        shadow-[0_0_40px_rgba(0,67,73,0.08)] glass-sidebar
        max-md:hidden
      ">
        <div className="mb-2">
          <h1 className="
            bg-logo-gradient bg-clip-text font-main text-3xl font-extrabold
            tracking-tight text-transparent
          ">
            OceanEyes
          </h1>
          <p className="px-1 text-xs font-medium text-on-surface-variant/70">
            Deep Sea Station 01
          </p>
        </div>

        {/* Navigation Sidebar Links */}
        <nav className="flex flex-1 flex-col gap-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.isActive(activeTab);
            return (
              <button
                key={item.tab}
                className={`
                  flex w-full cursor-pointer items-center gap-3 rounded-xl
                  border-none px-4 py-3 text-left font-main text-sm
                  font-semibold transition-all duration-300
                  ${isActive
                    ? `bg-secondary-container/50 text-primary-dark shadow-sm`
                    : `
                      bg-transparent text-on-surface-variant
                      hover:bg-white/10 hover:text-primary-dark
                    `
                  }
                `}
                onClick={() => setActiveTab(item.tab)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.tab === 'settings' && activeAlertCount > 0 && (
                  <span className="
                    ml-auto rounded-full bg-error px-1.5 py-0.5 text-2xs
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
          mt-auto flex flex-col gap-3 border-t border-white/20 pt-4
        ">
          <button
            type="button"
            onClick={() => setShowAddTankModal(true)}
            className="
              flex w-full cursor-pointer items-center justify-center gap-2
              rounded-xl border-none bg-primary-dark px-4 py-3 font-main text-sm
              font-semibold text-white shadow-lg shadow-primary-dark/20
              transition-opacity
              hover:opacity-90
            "
          >
            <Plus size={18} />
            <span>Add Tank</span>
          </button>

          <div className="flex flex-col gap-1">
            <span className="
              text-2xs font-semibold tracking-wider text-on-surface-variant/70
              uppercase
            ">
              Active Tank
            </span>
            {linkedTanks.length <= 1 ? (
              <span className="text-base font-bold text-on-surface">
                {activeTank?.name ?? 'No tank linked'}
              </span>
            ) : (
              <select
                value={tankId ?? ''}
                onChange={(e) => selectTank(e.target.value || null)}
                className="
                  w-full cursor-pointer rounded-xl border border-white/30
                  bg-white/40 px-3 py-2.5 font-main text-sm font-semibold
                  text-on-surface backdrop-blur-sm outline-none
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

          <button
            type="button"
            className="
              flex w-full cursor-pointer items-center gap-3 rounded-xl
              border-none bg-transparent px-4 py-2 text-left font-main text-sm
              font-medium text-on-surface-variant transition-colors
              hover:text-primary-dark
            "
          >
            <HelpCircle size={18} />
            <span>Support</span>
          </button>
          <button
            type="button"
            className="
              flex w-full cursor-pointer items-center gap-3 rounded-xl
              border-none bg-transparent px-4 py-2 text-left font-main text-sm
              font-medium text-on-surface-variant transition-colors
              hover:text-primary-dark
            "
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile nav */}
      <nav className="
        fixed bottom-0 left-0 z-50 flex w-full items-center justify-around
        border-t border-white/30 bg-surface-card/80 p-2 backdrop-blur-xl
        md:hidden
      ">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.isActive(activeTab);
          return (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab)}
              className={`
                flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5
                text-xs font-medium transition-colors
                ${isActive ? `text-primary-dark` : `text-on-surface-variant`}
              `}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <TopAppBar activeTank={activeTank} />

      {/* ─── Main Content Canvas ─── */}
      <main className="
        ml-0 flex flex-1 justify-center overflow-y-auto pt-20
        md:ml-64
      ">
        <div className="
          mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 p-6 pb-24
          md:p-10 md:pb-12
        ">
          <ViewerApp />
        </div>
      </main>

      <AddTankModal
        show={showAddTankModal}
        onClose={() => setShowAddTankModal(false)}
        onCreateTank={async (name, cameraSource) => {
          await createAndLinkTank(name, cameraSource);
        }}
        onLinkTank={linkTank}
      />

      {/* Ambient liquid background blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-20">
        <div className="
          absolute top-[-100px] left-[-100px] size-[500px] animate-pulse
          rounded-full bg-secondary-container blur-[150px]
        " />
        <div
          className="
            absolute right-[-100px] bottom-[-200px] size-[600px] animate-pulse
            rounded-full bg-primary-fixed-dim blur-[180px]
          "
          style={{ animationDelay: '2s' }}
        />
      </div>
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
