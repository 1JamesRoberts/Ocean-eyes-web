import React from 'react';

interface VideoDecorationsProps {
  isCalibrating: boolean;
  isCalibDragging: boolean;
  waterLineY: number;
  currentFishCount: number;
  currentClarity: number;
}

export const VideoDecorations: React.FC<VideoDecorationsProps> = ({
  isCalibrating,
  isCalibDragging,
  waterLineY,
  currentFishCount,
  currentClarity
}) => {
  return (
    <>
      {/* Water Calibration Line Overlay — only visible during calibration */}
      {isCalibrating && (
        <div 
          className="absolute left-0 w-full h-[2px] border-t-2 border-dashed border-critical z-10"
          style={{
            top: `${Math.min(100, Math.max(0, (waterLineY / 240) * 100))}%`,
            transition: isCalibDragging ? 'none' : 'top 0.1s ease-out'
          }}
        >
          <span className="absolute right-2.5 -top-[18px] text-[9px] text-white bg-critical py-0.5 px-1.5 rounded font-semibold shadow-[0_0_8px_rgba(239,68,68,0.5)]">
            DRAG TO CALIBRATE
          </span>
        </div>
      )}

      {/* Bottom-left Telemetry Badges */}
      <div className="absolute bottom-3 left-3 flex gap-3 z-10">
        <div className="bg-[rgba(15,23,42,0.75)] py-1.5 px-3 rounded-xl text-[11px] text-white">
          <span className="text-text-muted block">FISH COUNT</span>
          <strong className="text-sm font-bold">{currentFishCount} detected</strong>
        </div>

        <div className="bg-[rgba(15,23,42,0.75)] py-1.5 px-3 rounded-xl text-[11px] text-white">
          <span className="text-text-muted block">FNU</span>
          <strong className="text-sm font-bold text-info">{currentClarity.toFixed(2)}</strong>
        </div>
      </div>
    </>
  );
};
