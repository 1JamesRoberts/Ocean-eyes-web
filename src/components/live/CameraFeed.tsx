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
  style?: React.CSSProperties;
  idlePlaceholder?: React.ReactNode;
}

export const CameraFeed = forwardRef<CameraFeedHandle, CameraFeedProps>(
  ({ feed, isStreaming, isWebcam, videoRef, filters, onDimensions, children, className = '', style, idlePlaceholder }, forwardedRef) => {
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

  const handleImageLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (onDimensions) {
      onDimensions(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight);
    }
  };

  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      style={style}
    >
      {isStreaming ? (
        <>
          {isWebcam ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={handleVideoLoaded}
              className="w-full h-auto block"
              style={filterStyle ? { filter: filterStyle } : undefined}
            />
          ) : (
            <img
              src={feed.mock_image || ''}
              alt="Live feed"
              onLoad={handleImageLoaded}
              className="w-full h-auto block"
              style={filterStyle ? { filter: filterStyle } : undefined}
            />
          )}

          {/* Overlay layer for children (badges, decorations, etc.) */}
          {children && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {children}
            </div>
          )}
        </>
      ) : (
        idlePlaceholder ?? (
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            <Video size={24} className="text-text-secondary" />
            <p className="text-text-secondary text-xs">Feed is idle. Connect stream to monitor.</p>
          </div>
        )
      )}
    </div>
  );
});
CameraFeed.displayName = 'CameraFeed';
