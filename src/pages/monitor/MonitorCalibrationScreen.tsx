import React, { useState } from 'react';
import { useTank } from '../../hooks/useTank';
import { useLiveFeed } from '../../hooks/useLiveFeed';
import { MonitorButton } from '../../components/monitor/MonitorPrimitives';

interface ScreenProps {
  onNavigate: (screen: 'welcome' | 'qr' | 'calibration' | 'active') => void;
}

export const MonitorCalibrationScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { activeTank: contextActiveTank, tanks } = useTank();
  const activeTank = contextActiveTank || (tanks.length > 0 ? tanks[0] : null);
  const { liveState, updateCalibration } = useLiveFeed();
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
      <h3 className="mb-0.5 text-center type-title-inverse">
        Water Line Calibration
      </h3>
      {activeTank && (
        <span className="
          mb-2 block text-center type-caption text-brand
        ">
          Calibrating: {activeTank.name}
        </span>
      )}
      <p className="mb-4 text-center type-caption-inverse">
        Drag the dotted red line visually to match the physical water surface level in your tank.
      </p>

      {/* Interactive Calibration Canvas */}
      <div
        role="slider"
        tabIndex={0}
        aria-label="Water line position"
        aria-valuemin={0}
        aria-valuemax={240}
        aria-valuenow={Math.round(lineY)}
        aria-valuetext={`${Math.round(((240 - lineY) / 240) * 100)} percent tank height`}
        onMouseMove={(e) => {
          if (e.buttons === 1) handleDrag(e);
        }}
        onMouseDown={handleDrag}
        onTouchMove={handleDrag}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setLineY((value) => Math.max(0, value - 4));
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setLineY((value) => Math.min(240, value + 4));
          }
        }}
        className="
          shimmer flex h-[240px] touch-none cursor-ns-resize items-center justify-center
          rounded-xl border-2 border-[#1E293B]
          bg-[radial-gradient(circle_at_center,#1E293B_0%,#0F172A_100%)]
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-monitor-accent
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
        <MonitorButton
          variant="primary"
          className="flex-1"
          onClick={handleSave}
          disabled={!activeTank}
        >
          {isSaved ? '✓ Calibration Saved' : 'Confirm Level'}
        </MonitorButton>
        <MonitorButton variant="ghost" onClick={() => onNavigate('welcome')}>
          Cancel
        </MonitorButton>
      </div>
    </div>
  );
};
