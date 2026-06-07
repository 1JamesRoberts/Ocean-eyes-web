// App.tsx - Full-Screen Desktop Dashboard Playground Coordinator
import React from 'react';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { useTank } from './hooks/useTank';
import { useAlerts } from './hooks/useAlerts';
import { useSimulation } from './hooks/useSimulation';
import { ViewerApp } from './pages/ViewerApp';
import { IoTMonitor } from './pages/IoTMonitor';
import { 
  Home, 
  Video, 
  Settings, 
  RefreshCw,
  Fish
} from 'lucide-react';

const OceanEyesDashboard: React.FC = () => {
  const { activeTab, setActiveTab } = useNavigation();
  const { tankId, activeTank } = useTank();
  const { alerts } = useAlerts();
  const { simulationActive, setSimulationActive, triggerManualReading } = useSimulation();

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

        {/* Global Simulation Controller */}
        <div style={{ 
          marginTop: 'auto', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px',
          paddingTop: '16px',
          borderTop: '1px solid var(--color-border)'
        }}>
          <button 
            className="secondary-button" 
            style={{ 
              width: '100%',
              padding: '10px', 
              fontSize: '12px', 
              borderRadius: '10px', 
              backgroundColor: simulationActive ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
              borderColor: simulationActive ? 'var(--color-good)' : 'var(--color-border)',
              color: simulationActive ? 'var(--color-good)' : 'var(--color-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            onClick={() => setSimulationActive(!simulationActive)}
          >
            <RefreshCw size={12} className={simulationActive ? 'anim-float-1' : ''} />
            <span>{simulationActive ? 'Simulator Active' : 'Simulator Idle'}</span>
          </button>

          <button 
            className="primary-button" 
            style={{ width: '100%', padding: '10px', fontSize: '12px', borderRadius: '10px', boxShadow: 'none' }}
            onClick={triggerManualReading}
          >
            Scan Metrics Now
          </button>
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
    <NavigationProvider>
      <OceanEyesDashboard />
    </NavigationProvider>
  );
};

export default App;
