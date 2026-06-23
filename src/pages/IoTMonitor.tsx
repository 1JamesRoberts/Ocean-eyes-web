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
    <div
      className="
        flex h-[520px] w-full flex-col overflow-hidden rounded-xl border
        border-[#1e293b] bg-[#090d11]
      "
    >
      {/* Device Header Bar */}
      <div className="
        flex h-[42px] items-center justify-between border-b border-[#1e293b]
        bg-[#090d11] px-4 text-caption font-semibold tracking-wider
        text-[#94a3b8]
      ">
        <div className="flex items-center gap-1.5">
          <Cpu size={12} className="animate-float-2 text-brand" />
          <span>OCEANEYES MONITOR v1.0.4</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className={`
            size-1.5 rounded-full
            ${tankId ? 'bg-good' : `bg-warning`}
          `} />
          <span>{tankId ? 'LINKED' : 'UNPAIRED'}</span>
        </div>
      </div>

      {/* Screen Body */}
      <div className="shimmer flex flex-1 flex-col">
        {renderScreen()}
      </div>
    </div>
  );
};
