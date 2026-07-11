import React from 'react';
import { useTank } from '../../hooks/useTank';
import { Camera } from 'lucide-react';
import { MonitorButton } from '../../components/monitor/MonitorPrimitives';

interface ScreenProps {
  onNavigate: (screen: 'welcome' | 'qr' | 'calibration' | 'active') => void;
}

export const MonitorWelcomeScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { tankId, activeTank: contextActiveTank, tanks } = useTank();
  const activeTank = contextActiveTank || (tanks.length > 0 ? tanks[0] : null);

  return (
    <div className="
      flex h-full flex-col items-center justify-center
      bg-[radial-gradient(circle_at_center,#0F172A_0%,#020617_100%)] px-6 py-10
      text-center text-white
    ">
      <div className="
        mb-6 flex size-20 items-center justify-center rounded-full border-[3px]
        border-[#0D9488] bg-[linear-gradient(135deg,#115E59_0%,#0F766E_100%)]
        shadow-[0_0_20px_rgba(13,148,136,0.4)]
      ">
        <Camera size={36} className="text-[#2DD4BF]" />
      </div>

      <h2 className="mb-2 text-section font-extrabold text-[#F1F5F9]">Smart Tank Unit</h2>
      <p className="mb-8 max-w-[320px] type-body-muted-inverse">
        Position the camera unit against the aquarium glass, complete calibration, and pair with your mobile app.
      </p>

      <div className="flex w-full max-w-[280px] flex-col gap-3.5">
        <MonitorButton variant="primary" fullWidth onClick={() => onNavigate('active')}>
          {tankId ? 'Open Live Camera Monitor' : 'Open Live Camera Monitor (Demo Mode)'}
        </MonitorButton>

        <MonitorButton fullWidth onClick={() => onNavigate('qr')}>
          Pair with Mobile App
        </MonitorButton>

        <MonitorButton variant="ghost" fullWidth onClick={() => onNavigate('calibration')}>
          Calibrate Water Level
        </MonitorButton>
      </div>

      {activeTank && (
        <div className="mt-10 type-caption-inverse">
          Linked Tank: <strong>{activeTank.name}</strong> {!tankId && <span className="
            ml-1 text-warning
          ">(Unpaired Demo)</span>}
        </div>
      )}
    </div>
  );
};
