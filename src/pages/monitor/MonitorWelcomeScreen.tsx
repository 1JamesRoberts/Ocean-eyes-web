import React from 'react';
import { useTank } from '../../hooks/useTank';
import { Camera } from 'lucide-react';

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
      <p className="
        mb-8 max-w-[320px] text-[13px] leading-[145%] text-[#94A3B8]
      ">
        Position the camera unit against the aquarium glass, complete calibration, and pair with your mobile app.
      </p>

      <div className="flex w-full max-w-[280px] flex-col gap-3.5">
        <button
          className="
            inline-flex w-full cursor-pointer items-center justify-center gap-2
            rounded-xl border-none bg-primary-gradient px-6 py-3.5 font-main
            text-h3 font-semibold text-text-inverse
            shadow-[0_4px_12px_rgba(13,148,136,0.15)] transition-smooth
            hover:bg-primary-hover-gradient
            active:scale-[0.98]
          "
          onClick={() => onNavigate('active')}
        >
          {tankId ? 'Open Live Camera Monitor' : 'Open Live Camera Monitor (Demo Mode)'}
        </button>

        <button
          className="
            inline-flex w-full cursor-pointer items-center justify-center gap-2
            rounded-xl border border-monitor-border bg-[#1E293B] px-6 py-3.5
            font-main text-h3 font-semibold text-[#E2E8F0] transition-smooth
            hover:bg-monitor-border
            active:scale-[0.98]
          "
          onClick={() => onNavigate('qr')}
        >
          Pair with Mobile App
        </button>

        <button
          className="
            inline-flex w-full cursor-pointer items-center justify-center gap-2
            rounded-xl border border-monitor-border bg-transparent px-5 py-3
            font-main text-[14px] font-semibold text-[#E2E8F0] transition-smooth
            hover:bg-[rgba(255,255,255,0.05)]
          "
          onClick={() => onNavigate('calibration')}
        >
          Calibrate Water Level
        </button>
      </div>

      {activeTank && (
        <div className="mt-10 text-xs text-[#64748B]">
          Linked Tank: <strong>{activeTank.name}</strong> {!tankId && <span className="
            ml-1 text-warning
          ">(Unpaired Demo)</span>}
        </div>
      )}
    </div>
  );
};
