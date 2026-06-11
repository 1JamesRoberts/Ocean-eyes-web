import React from 'react';

interface VideoDecorationsProps {
  currentFishCount: number;
  currentClarity: number;
}

export const VideoDecorations: React.FC<VideoDecorationsProps> = ({
  currentFishCount,
  currentClarity
}) => {
  return (
    <>
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
