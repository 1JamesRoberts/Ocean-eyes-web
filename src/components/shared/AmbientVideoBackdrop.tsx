import React from 'react';
import type { CameraFilters } from '../../types/aquarium';
import { useLiveFeed } from '../../hooks/useLiveFeed';
import { CameraFeed } from '../live/CameraFeed';

interface AmbientVideoBackdropProps {
  filters?: CameraFilters;
  temperatureOverlay?: React.CSSProperties | null;
  tintOverlay?: React.CSSProperties | null;
}

export const AmbientVideoBackdrop: React.FC<AmbientVideoBackdropProps> = ({
  filters,
  temperatureOverlay,
  tintOverlay,
}) => {
  const { activeFeed, isWebcam, isStreaming, videoRef } = useLiveFeed();

  return (
    <div className="mobile-ambient-backdrop" data-ambient-video-backdrop aria-hidden="true">
      {isStreaming && (
        <div className="mobile-ambient-feed">
          <CameraFeed
            feed={activeFeed}
            isStreaming={isStreaming}
            isWebcam={isWebcam}
            videoRef={videoRef}
            filters={filters}
            className="size-full"
            videoClassName="size-full object-cover object-bottom"
          >
            {temperatureOverlay && (
              <div
                className="absolute inset-0 mix-blend-color"
                style={temperatureOverlay}
              />
            )}
            {tintOverlay && (
              <div
                className="absolute inset-0 mix-blend-color"
                style={tintOverlay}
              />
            )}
          </CameraFeed>
        </div>
      )}
      <div className="mobile-ambient-smoke" />
    </div>
  );
};
