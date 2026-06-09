// App.tsx - Full-Screen Desktop Dashboard Playground Coordinator
import React from 'react';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { useTank } from './hooks/useTank';
import { useAlerts } from './hooks/useAlerts';
import { useDataSync } from './hooks/useDataSync';
import { ThemeProvider } from './hooks/useTheme';
import { ViewerApp } from './pages/ViewerApp';
import { IoTMonitor } from './pages/IoTMonitor';
import { 
  Home, 
  Video, 
  Settings, 
  RefreshCw,
  Fish,
  BarChart3
} from 'lucide-react';

const OceanEyesDashboard: React.FC = () => {
  const { activeTab, setActiveTab } = useNavigation();
  const { tankId, activeTank, tanks, linkedTanks, selectTank } = useTank();
  const { alerts } = useAlerts();
  const { syncActive, setSyncActive, triggerManualSync, backendAvailable } = useDataSync();

  const activeAlertCount = alerts.filter(a => !a.resolved).length;

  return (
    <div className="dashboard-wrapper">
      {/* ─── Sidebar Navigation ─── */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src="/logo.png" alt="" style={{ height: 36, width: 'auto', display: 'block' }} />
            <span className="sidebar-logo-text" style={{ fontFamily: 'var(--font-main)', letterSpacing: '-0.03em' }}>OceanEyes</span>
          </div>
        </div>

        {/* Linked Tank Brief Info Card */}
        {activeTank && (
          <div style={{
            background: 'var(--color-background)',
            padding: '16px',
            borderRadius: '16px',
            border: '1px solid var(--color-border)'
          }}>
            <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Connected Unit
            </span>
            <strong style={{ fontSize: '15px', color: 'var(--color-text-primary)', display: 'block', marginTop: '2px' }}>
              {activeTank.name}
            </strong>
            <code style={{ fontSize: '10px', color: 'var(--color-primary-dark)', display: 'block', marginTop: '4px' }}>
              {activeTank.id}
            </code>
          </div>
        )}

        {/* Navigation Sidebar Links */}
        <nav className="sidebar-menu">
          <button 
            className={`sidebar-link ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
          >
            <Home size={18} />
            <span>Dashboard</span>
          </button>

          <button 
            className={`sidebar-link ${activeTab === 'live' ? 'active' : ''}`}
            onClick={() => setActiveTab('live')}
          >
            <Video size={18} />
            <span>Live Video Feed</span>
          </button>

          <button 
            className={`sidebar-link ${activeTab === 'my_fish' ? 'active' : ''}`}
            onClick={() => setActiveTab('my_fish')}
          >
            <Fish size={18} />
            <span>My Fish</span>
          </button>

          <button 
            className={`sidebar-link ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart3 size={18} />
            <span>Analytics</span>
          </button>

          <button 
            className={`sidebar-link ${activeTab === 'settings' || activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={18} />
            <span>Tank Settings</span>
            {activeAlertCount > 0 && (
              <span style={{
                marginLeft: 'auto',
                backgroundColor: 'var(--color-critical)',
                color: '#FFF',
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '10px',
                fontWeight: 700
              }}>
                {activeAlertCount}
              </span>
            )}
          </button>
        </nav>

        {/* Data Sync & Tank Selector */}
        <div style={{ 
          marginTop: 'auto', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px',
          paddingTop: '16px',
          borderTop: '1px solid var(--color-border)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Tank
            </span>
            {linkedTanks.length <= 1 ? (
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {activeTank?.name ?? 'No tank linked'}
              </span>
            ) : (
              <select
                value={tankId ?? ''}
                onChange={(e) => selectTank(e.target.value || null)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  borderRadius: '10px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-main)',
                  cursor: 'pointer'
                }}
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              className="secondary-button" 
              style={{ 
                flex: 1,
                padding: '10px', 
                fontSize: '12px', 
                borderRadius: '10px', 
                backgroundColor: syncActive ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                borderColor: syncActive ? 'var(--color-good)' : 'var(--color-border)',
                color: syncActive ? 'var(--color-good)' : 'var(--color-text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
              onClick={() => setSyncActive(!syncActive)}
            >
              <RefreshCw size={12} className={syncActive ? 'anim-float-1' : ''} />
              <span>{syncActive ? 'Sync Active' : 'Sync Paused'}</span>
            </button>

            <button
              className="secondary-button"
              title="Refresh data now"
              onClick={triggerManualSync}
              style={{
                padding: '10px',
                fontSize: '12px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: backendAvailable === false ? 0.5 : 1
              }}
            >
              <RefreshCw size={12} />
            </button>
          </div>

          {backendAvailable === false && (
            <span style={{ fontSize: '11px', color: 'var(--color-warning)' }}>
              AI backend unavailable. Waiting for connection…
            </span>
          )}
        </div>
      </aside>

      {/* ─── Main Content Canvas ─── */}
      <main className="main-canvas">
        {/* Under onboarding check */}
        {tankId === null && activeTab !== 'monitor' && activeTab !== 'live' ? (
          <div className="card-decoration" style={{ maxWidth: '480px', margin: '40px auto 0 auto', padding: '40px' }}>
            <ViewerApp />
          </div>
        ) : activeTab === 'monitor' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="canvas-header">
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Hardware Unit</span>
                <h1 className="canvas-title">Aquarium Smart Scanner Console</h1>
              </div>
            </div>
            
            <div className="card-decoration" style={{ padding: '8px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
              <IoTMonitor />
            </div>
          </div>
        ) : (
          <ViewerApp />
        )}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <NavigationProvider>
        <OceanEyesDashboard />
      </NavigationProvider>
    </ThemeProvider>
  );
};

export default App;
