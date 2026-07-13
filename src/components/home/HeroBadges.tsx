import React from "react";

interface HeroBadgesProps {
  displayClarity: number;
  displayFishCount: number;
}

/**
 * Absolute-positioned "Live" + fish-count pills for hero video sections.
 * Owned by the Dashboard (home) screen and consumed by other hero surfaces
 * such as the Analytics heatmap.
 */
export const HeroBadges: React.FC<HeroBadgesProps> = ({
  displayClarity: _displayClarity,
  displayFishCount,
}) => {
  return (
    <>
      <div
        className="
          absolute inset-0 bg-linear-to-b from-black/20 via-transparent
          to-transparent
        "
      />
      <div className="absolute top-3 left-4 z-10 flex gap-2">
        <span
          className="
            rounded-full bg-black/40 px-2.5 py-1 text-2xs font-semibold
            text-white backdrop-blur-md
          "
        >
          Live
        </span>
        <span
          className="
            rounded-full bg-black/40 px-2.5 py-1 text-2xs text-white
            backdrop-blur-md
          "
        >
          {displayFishCount} fish
        </span>
      </div>
    </>
  );
};
