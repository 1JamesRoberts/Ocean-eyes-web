// IoTMonitor.tsx - Recreating Flutter UI screens for the Smart Tank Monitor unit
import React, { useState } from 'react';
import { useTank } from '../hooks/useTank';
import { Cpu } from 'lucide-react';
import { MonitorWelcomeScreen } from './monitor/MonitorWelcomeScreen';
import { MonitorQrDisplayScreen } from './monitor/MonitorQrDisplayScreen';
import { MonitorCalibrationScreen } from './monitor/MonitorCalibrationScreen';
import { ActiveMonitoringScreen } from './monitor/ActiveMonitoringScreen';

export const IoTMonitor: React.FC = () => {
  const { tankId } = useTank();
  const [monitorScreen, setMonitorScreen] = useState<'welcome' | 'qr' | 'calibration' | 'active'>('welcome');

  const renderScreen = () => {
    switch (monitorScreen) {
      case 'welcome':
        return <MonitorWelcomeScreen onNavigate={setMonitorScreen} />;
      case 'qr':
        return <MonitorQrDisplayScreen onNavigate={setMonitorScreen} />;
      case 'calibration':
        return <MonitorCalibrationScreen onNavigate={setMonitorScreen} />;
      case 'active':
        return <ActiveMonitoringScreen onNavigate={setMonitorScreen} />;
      default:
        return <MonitorWelcomeScreen onNavigate={setMonitorScreen} />;
    }
  };

  return (
    <div className="monitor-screen" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '520px', // Fixed high fidelity panel height to simulate a hardware tablet unit
      width: '100%',
      background: '#090D11',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1px solid #1E293B'
    }}>
      {/* Device Header Bar */}
      <div style={{
        height: '42px',
        backgroundColor: '#090D11',
        borderBottom: '1px solid #1E293B',
        padding: '0 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: '#94A3B8',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.05em'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Cpu size={12} className="anim-float-2" style={{ color: 'var(--color-primary)' }} />
          <span>OCEANEYES MONITOR v1.0.4</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: tankId ? 'var(--color-good)' : 'var(--color-warning)'
          }} />
          <span>{tankId ? 'LINKED' : 'UNPAIRED'}</span>
        </div>
      </div>

      {/* Screen Body */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {renderScreen()}
      </div>
    </div>
  );
};
