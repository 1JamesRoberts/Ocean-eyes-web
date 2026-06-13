import React, { useRef, useState } from 'react';
import { Video, Maximize2 } from 'lucide-react';
import { useCameraFeed } from '../../hooks/useCameraFeed';
import { CameraFeed } from '../live/CameraFeed';
import type { TankBrief } from '../../types/aquarium';

interface LiveFeedPreviewProps {
  activeTank: TankBrief | undefined;
  displayClarity: number;
  displayFishCount: number;
  onViewAdvanced: () => void;
  onGoFullscreen?: () => void;
}

export const LiveFeedPreview: React.FC<LiveFeedPreviewProps> = ({
  activeTank,
  displayClarity,
  displayFishCount,
  onViewAdvanced,
  onGoFullscreen
}) => {
  const { activeFeed, isWebcam, isStreaming, videoRef, startStream } = useCameraFeed(activeTank?.id ?? null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [isHoveringVideo, setIsHoveringVideo] = useState(false);

  const handleVideoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onGoFullscreen) {
      onGoFullscreen();
    }
  };

  return (
    <div
      className="
        flex cursor-pointer flex-col gap-3.5 rounded-[20px] border
        border-[rgba(13,148,136,0.02)] bg-surface-card p-5 shadow-card
        transition-smooth
        hover:-translate-y-px hover:border-[rgba(13,148,136,0.12)]
        hover:shadow-[0_8px_24px_rgba(13,148,136,0.08)]
      "
      onClick={onViewAdvanced}
    >
      <div className="flex items-center justify-between">
        <h3 className="
          m-0 flex items-center gap-1.5 text-[15px] font-bold text-text-main
        ">
          <Video size={16} className="text-primary-dark" />
          <span>Live Feed Monitor</span>
        </h3>
      </div>

      <div
        ref={videoContainerRef}
        className="
          live-camera-feed relative flex w-full cursor-pointer items-center
          justify-center overflow-hidden rounded-xl border border-border-card
          bg-background-app
        "
        onClick={handleVideoClick}
        onMouseEnter={() => setIsHoveringVideo(true)}
        onMouseLeave={() => setIsHoveringVideo(false)}
      >
        {isStreaming ? (
          <>
            <CameraFeed
              feed={activeFeed}
              isStreaming={isStreaming}
              isWebcam={isWebcam}
              videoRef={videoRef}
              className="w-full"
              idlePlaceholder={
                <div className="
                  flex flex-col items-center justify-center gap-2 py-8
                ">
                  <Video size={24} color="var(--color-text-secondary)" />
                  <p className="text-xs text-text-muted">Feed is idle. Connect stream to monitor.</p>
                </div>
              }
            />
            <div className="
              pointer-events-none absolute top-0 left-0 size-full
              overflow-hidden
            ">
            </div>

            <div className="absolute bottom-2 left-2 z-10 flex gap-1.5">
              <div className="
                rounded-md bg-[rgba(15,23,42,0.85)] px-1.5 py-0.5 text-[9px]
                text-white
              ">
                <strong>{displayFishCount} fish</strong>
              </div>
              <div className="
                rounded-md bg-[rgba(15,23,42,0.85)] px-1.5 py-0.5 text-[9px]
                text-white
              ">
                <strong className="text-info">{displayClarity.toFixed(2)} FNU</strong>
              </div>
            </div>

            {isHoveringVideo && (
              <div
                className="
                  pointer-events-none absolute inset-0 z-20 flex flex-col
                  items-center justify-center gap-1.5 bg-[rgba(15,23,42,0.55)]
                  transition-opacity duration-250 ease-in-out
                "
              >
                <Maximize2 size={24} color="#FFF" className="opacity-90" />
                <span className="
                  text-[11px] font-semibold text-white opacity-90
                ">
                  Click for fullscreen
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="p-3 text-center">
            <div className="mb-2 flex justify-center">
              <Video size={24} className="text-text-muted" />
            </div>
            <p className="mb-2.5 text-xs text-text-muted">
              Feed is idle. Connect stream to monitor.
            </p>
            <button
              className="
                mx-auto inline-flex cursor-pointer items-center justify-center
                gap-2 rounded-3xl border-none bg-primary-gradient px-3 py-1.5
                font-main text-xs font-semibold text-text-inv
                shadow-[0_4px_12px_rgba(13,148,136,0.15)] transition-smooth
                hover:bg-primary-hover-gradient
                active:scale-[0.98]
              "
              onClick={(e) => {
                e.stopPropagation();
                startStream();
              }}
            >
              Connect Stream
            </button>
          </div>
        )}
      </div>


    </div>
  );
};
