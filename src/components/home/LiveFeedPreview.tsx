import React, { useRef, useState } from "react";
import { Maximize2 } from "lucide-react";
import { useLiveFeed } from "../../hooks/useLiveFeed";
import { HeadedCard } from "../shared";
import { CameraFeed } from "../live/CameraFeed";
import { HeroBadges } from "./HeroBadges";
import type { CameraFilters, TankBrief } from "../../types/aquarium";

interface LiveFeedPreviewProps {
  activeTank?: TankBrief | undefined;
  displayClarity: number;
  displayFishCount: number;
  onViewAdvanced: () => void;
  onGoFullscreen?: () => void;
  overlay?: React.ReactNode;
  filters?: CameraFilters;
  temperatureOverlay?: React.CSSProperties | null;
  tintOverlay?: React.CSSProperties | null;
  hero?: boolean;
}

export const LiveFeedPreview: React.FC<LiveFeedPreviewProps> = ({
  displayClarity,
  displayFishCount,
  onViewAdvanced,
  onGoFullscreen,
  overlay,
  filters,
  temperatureOverlay,
  tintOverlay,
  hero = false,
}) => {
  const { activeFeed, isWebcam, isStreaming, videoRef, startStream } =
    useLiveFeed();
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [isHoveringVideo, setIsHoveringVideo] = useState(false);

  const handleVideoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onGoFullscreen) {
      onGoFullscreen();
    }
  };

  if (hero) {
    return (
      <div className="relative size-full cursor-pointer" onClick={onViewAdvanced}>
          <CameraFeed
            feed={activeFeed}
            isStreaming={isStreaming}
            isWebcam={isWebcam}
            videoRef={videoRef}
            filters={filters}
            className="size-full"
            videoClassName="h-full w-full object-cover"
            idlePlaceholder={
              <div className="
                flex h-full flex-col items-center justify-center gap-2
              ">
                <span
                  className="material-symbols-outlined text-2xl text-slate-grey"
                >
                  videocam
                </span>
                <p className="type-caption">
                  Feed is idle. Connect stream to monitor.
                </p>
                <button
                  className="
                    mx-auto mt-2 inline-flex cursor-pointer items-center
                    justify-center gap-2 rounded-3xl border-none
                    bg-primary-gradient px-4 py-2 type-caption-inverse shadow-primary-hover
                    transition-smooth
                    hover:bg-primary-hover-gradient
                  "
                  onClick={(e) => {
                    e.stopPropagation();
                    startStream();
                  }}
                >
                  Connect Stream
                </button>
              </div>
            }
          >
            {temperatureOverlay && (
              <div
                className="pointer-events-none absolute inset-0 z-4 mix-blend-color"
                style={temperatureOverlay}
              />
            )}
            {tintOverlay && (
              <div
                className="pointer-events-none absolute inset-0 z-5 mix-blend-color"
                style={tintOverlay}
              />
            )}
          </CameraFeed>

          {isStreaming && (
            <HeroBadges
              displayClarity={displayClarity}
              displayFishCount={displayFishCount}
            />
          )}
          {overlay && (
            <div className="
              pointer-events-none absolute inset-0 size-full
            ">
              {overlay}
            </div>
          )}
      </div>
    );
  }

  return (
    <HeadedCard
      as="section"
      icon="videocam"
      title="Live Feed Monitor"
      headerVariant="edge"
      className="cursor-pointer"
      onClick={onViewAdvanced}
      action={(
        <div className="flex gap-2">
          <span
            className="
              rounded-full bg-verdigris/10 px-3 py-1 type-caption text-verdigris
            "
          >
            Live
          </span>
          <span
            className="rounded-full bg-pine-teal/10 px-3 py-1 type-caption text-pine-teal"
          >
            1080p
          </span>
        </div>
      )}
    >

      <div
        ref={videoContainerRef}
        className="
          fs-reset shimmer relative flex aspect-video w-full cursor-pointer
          items-center justify-center bg-prussian-blue
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
              className="
                size-full object-cover opacity-90 transition-opacity
                group-hover:opacity-100
              "
              idlePlaceholder={
                <div
                  className="
                    flex flex-col items-center justify-center gap-2 py-8
                  "
                >
                  <span
                    className="
                      material-symbols-outlined text-2xl text-slate-grey
                    "
                  >
                    videocam
                  </span>
                  <p className="type-caption">
                    Feed is idle. Connect stream to monitor.
                  </p>
                </div>
              }
            />
            <div
              className="
                pointer-events-none absolute top-0 left-0 size-full
                overflow-hidden
              "
            />

            <div className="absolute bottom-4 left-4 z-10 flex gap-2">
              <div
                className="
                  rounded-lg border border-white/20 bg-prussian-blue/40 px-3 py-1
                  type-caption-inverse backdrop-blur-md
                "
              >
                {displayFishCount} fish
              </div>
              <div
                className="
                  rounded-lg border border-white/20 bg-prussian-blue/40 px-3 py-1
                  type-caption-inverse backdrop-blur-md
                "
              >
                {displayClarity.toFixed(2)} FNU
              </div>
            </div>

            {isHoveringVideo && (
              <div
                className="
                  pointer-events-none absolute inset-0 z-20 flex items-center
                  justify-center bg-prussian-blue/40 transition-opacity
                "
              >
                <div
                  className="
                    rounded-full border border-white/30 bg-white/20 p-4
                    text-white backdrop-blur-xl
                  "
                >
                  <Maximize2 size={24} />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-2.5 text-center">
            <div className="mb-2 flex justify-center">
              <span
                className="material-symbols-outlined text-2xl text-slate-grey"
              >
                videocam
              </span>
            </div>
            <p className="mb-2.5 type-caption">
              Feed is idle. Connect stream to monitor.
            </p>
            <button
              className="
                mx-auto inline-flex cursor-pointer items-center justify-center
                gap-2 rounded-3xl border-none bg-primary-gradient px-4 py-2
                type-caption-inverse
                shadow-primary-hover transition-smooth
                hover:bg-primary-hover-gradient
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
    </HeadedCard>
  );
};
