import React, { useImperativeHandle, forwardRef } from 'react';
import { Video } from 'lucide-react';
import type { CameraFilters, CameraFeedConfig } from '../../types/aquarium';

export interface CameraFeedHandle {
  videoElement: HTMLVideoElement | null;
}

interface CameraFeedProps {
  feed: CameraFeedConfig;
  isStreaming: boolean;
  isWebcam: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  filters?: CameraFilters;
  onDimensions?: (width: number, height: number) => void;
  children?: React.ReactNode;
  className?: string;
  videoClassName?: string;
  style?: React.CSSProperties;
  idlePlaceholder?: React.ReactNode;
}

export const CameraFeed = forwardRef<CameraFeedHandle, CameraFeedProps>(
  ({ isStreaming, videoRef, filters, onDimensions, children, className = '', videoClassName = '', style, idlePlaceholder }, forwardedRef) => {
    useImperativeHandle(forwardedRef, () => ({
      videoElement: videoRef.current,
    }));

  const filterStyle = filters
    ? `contrast(${filters.contrast}%) brightness(${filters.brightness}%) saturate(${filters.saturation}%)`
    : undefined;

  const handleVideoLoaded = () => {
    if (videoRef.current && onDimensions) {
      onDimensions(videoRef.current.videoWidth, videoRef.current.videoHeight);
    }
  };

  return (
    <div
      className={`
        shimmer w-full
        ${className}
      `}
      style={style}
    >
      {isStreaming ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={handleVideoLoaded}
            className={`
              block h-auto w-full
              ${videoClassName}
            `}
            style={filterStyle ? { filter: filterStyle } : undefined}
          />

          {/* Overlay layer for children (badges, decorations, etc.) */}
          {children && (
            <div className="
              pointer-events-none absolute inset-0 overflow-hidden
            ">
              {children}
            </div>
          )}
        </>
      ) : (
        idlePlaceholder ?? (
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            <Video size={24} className="text-text-muted" />
            <p className="text-xs text-text-muted">Feed is idle. Connect stream to monitor.</p>
          </div>
        )
      )}
    </div>
  );
});
CameraFeed.displayName = 'CameraFeed';
