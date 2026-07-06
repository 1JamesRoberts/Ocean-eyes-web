import React, { useState } from 'react';
import { useTank } from '../../hooks/useTank';
import { useLiveFeed } from '../../hooks/useLiveFeed';

interface ScreenProps {
  onNavigate: (screen: 'welcome' | 'qr' | 'calibration' | 'active') => void;
}

export const MonitorCalibrationScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { activeTank: contextActiveTank, tanks } = useTank();
  const activeTank = contextActiveTank || (tanks.length > 0 ? tanks[0] : null);
  const { liveState, updateCalibration } = useLiveFeed(activeTank?.id ?? null);
  const activeFeedCalibration = liveState?.feeds.find(f => f.id === liveState?.selected_feed_id)?.calibration;
  const [lineY, setLineY] = useState(activeFeedCalibration?.water_line_y || 120);
  const [isSaved, setIsSaved] = useState(false);
  const staticWaterLineY = activeFeedCalibration?.water_line_y || 120; // Static camera feed reference

  const handleDrag = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const y = Math.min(240, Math.max(0, clientY - rect.top));
    setLineY(y);
  };

  const handleSave = () => {
    if (activeTank) {
      updateCalibration(lineY);
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        onNavigate('welcome');
      }, 1500);
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#090D11] p-6 text-white">
      <h3 className="mb-0.5 text-center text-base font-bold text-[#E2E8F0]">
        Water Line Calibration
      </h3>
      {activeTank && (
        <span className="
          mb-2 block text-center text-caption font-semibold text-brand
        ">
          Calibrating: {activeTank.name}
        </span>
      )}
      <p className="mb-4 text-center text-caption leading-[135%] text-[#64748B]">
        Drag the dotted red line visually to match the physical water surface level in your tank.
      </p>

      {/* Interactive Calibration Canvas */}
      <div
        onMouseMove={(e) => {
          if (e.buttons === 1) handleDrag(e);
        }}
        onMouseDown={handleDrag}
        onTouchMove={handleDrag}
        className="
          shimmer flex h-[240px] cursor-ns-resize items-center justify-center
          rounded-xl border-2 border-[#1E293B]
          bg-[radial-gradient(circle_at_center,#1E293B_0%,#0F172A_100%)]
        "
      >

        {/* Static Water Body Representation of Tank (Simulating Camera Feed) */}
        <div
          className="
            pointer-events-none absolute bottom-0 left-0 z-1 w-full border-t-2
            border-[rgba(255,255,255,0.5)]
          "
          style={{
            height: `${240 - staticWaterLineY}px`,
            background: 'linear-gradient(180deg, rgba(20, 184, 166, 0.35) 0%, rgba(13, 148, 136, 0.55) 100%)'
          }}
        >
          {/* Bubbles */}
        </div>

        {/* Sand/Substrate Bed */}
        <div
          className="
            pointer-events-none absolute bottom-0 left-0 z-2 h-6 w-full border-t
            border-monitor-border
            bg-[linear-gradient(0deg,#0F172A_0%,#1E293B_100%)]
          "
        />

        {/* Glass Tank Frame Reflection */}
        <div
          className="
            pointer-events-none absolute top-0 left-0 z-15 size-full
            rounded-[10px] border-2 border-[rgba(45,212,191,0.25)]
            shadow-[inset_0_0_20px_rgba(45,212,191,0.15)]
          "
        />

        {/* Dynamic Water Level Line Indicator */}
        <div
          className="
            pointer-events-none absolute left-0 z-10 flex h-0.5 w-full
            justify-center border-t-2 border-dashed border-critical
          "
          style={{ top: `${lineY}px` }}
        />

        {/* Water Level Label */}
        <div
          className="
            pointer-events-none absolute right-2.5 z-12 rounded-sm bg-critical
            px-1.5 py-0.5 text-3xs font-semibold text-white
          "
          style={{ top: `${lineY - 10}px` }}
        >
          DRAG TO WATER LINE ({Math.round(((240 - lineY) / 240) * 100)}%)
        </div>
      </div>

      <div className="mt-4 flex gap-2.5">
        <button
          className="
            inline-flex flex-1 cursor-pointer items-center justify-center gap-2
            rounded-xl border-none bg-primary-gradient px-6 py-3 font-main
            text-h3 font-semibold text-text-inverse
            shadow-[0_4px_12px_rgba(13,148,136,0.15)] transition-smooth
            hover:bg-primary-hover-gradient
            active:scale-[0.98]
            disabled:cursor-not-allowed disabled:opacity-50
          "
          onClick={handleSave}
          disabled={!activeTank}
        >
          {isSaved ? '✓ Calibration Saved' : 'Confirm Level'}
        </button>
        <button
          className="
            inline-flex cursor-pointer items-center justify-center gap-2
            rounded-xl border border-monitor-border bg-transparent px-4 py-3
            font-main text-[14px] font-semibold text-[#94A3B8] transition-smooth
            hover:bg-[rgba(255,255,255,0.05)]
          "
          onClick={() => onNavigate('welcome')}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
