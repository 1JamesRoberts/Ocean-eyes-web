import React from 'react';

interface VideoDecorationsProps {
  currentFishCount: number;
  currentClarity: number;
}

export const VideoDecorations: React.FC<VideoDecorationsProps> = ({
  currentFishCount,
  currentClarity,
}) => {
  return (
    <div className="absolute bottom-3 left-3 z-10 flex gap-3">
      <div
        className="
          rounded-xl bg-[rgba(15,23,42,0.75)] px-3 py-1.5 text-caption
          text-white
        "
      >
        <span className="block text-text-muted">FISH COUNT</span>
        <strong className="text-sm font-bold">{currentFishCount} detected</strong>
      </div>

      <div
        className="
          rounded-xl bg-[rgba(15,23,42,0.75)] px-3 py-1.5 text-caption
          text-white
        "
      >
        <span className="block text-text-muted">FNU</span>
        <strong className="text-sm font-bold text-info">{currentClarity.toFixed(2)}</strong>
      </div>
    </div>
  );
};
