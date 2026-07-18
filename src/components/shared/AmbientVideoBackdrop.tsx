import React, { useEffect, useRef } from 'react';
import type { CameraFilters } from '../../types/aquarium';
import { useLiveFeed } from '../../hooks/useLiveFeed';
import { useHeroMediaLayer } from './HeroActionLayerContext';

const AMBIENT_SAMPLE_WIDTH = 64;
const AMBIENT_SAMPLE_HEIGHT = 16;
const AMBIENT_SAMPLE_INTERVAL_MS = 10_000;
const AMBIENT_SOURCE_CROP_RATIO = 0.15;

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
  const { isStreaming } = useLiveFeed();
  const heroMediaLayer = useHeroMediaLayer();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const sourceVideo = heroMediaLayer?.querySelector('video');
    if (!isStreaming || !canvas || !sourceVideo) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    let intervalId: number | null = null;

    const captureBottomEdge = () => {
      if (
        document.hidden
        || sourceVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
        || sourceVideo.videoWidth === 0
        || sourceVideo.videoHeight === 0
      ) {
        return;
      }

      const sourceHeight = sourceVideo.videoHeight * AMBIENT_SOURCE_CROP_RATIO;
      const sourceY = sourceVideo.videoHeight - sourceHeight;

      context.clearRect(0, 0, AMBIENT_SAMPLE_WIDTH, AMBIENT_SAMPLE_HEIGHT);
      context.drawImage(
        sourceVideo,
        0,
        sourceY,
        sourceVideo.videoWidth,
        sourceHeight,
        0,
        0,
        AMBIENT_SAMPLE_WIDTH,
        AMBIENT_SAMPLE_HEIGHT,
      );
    };

    const stopSampling = () => {
      if (intervalId === null) return;
      window.clearInterval(intervalId);
      intervalId = null;
    };

    const startSampling = () => {
      if (document.hidden) return;
      captureBottomEdge();
      if (intervalId === null) {
        intervalId = window.setInterval(
          captureBottomEdge,
          AMBIENT_SAMPLE_INTERVAL_MS,
        );
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) stopSampling();
      else startSampling();
    };

    sourceVideo.addEventListener('loadeddata', startSampling);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    startSampling();

    return () => {
      stopSampling();
      sourceVideo.removeEventListener('loadeddata', startSampling);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [heroMediaLayer, isStreaming]);

  const filterStyle = filters
    ? {
      filter: `contrast(${filters.contrast}%) brightness(${filters.brightness}%) saturate(${filters.saturation}%)`,
    }
    : undefined;

  return (
    <div className="mobile-ambient-backdrop" data-ambient-video-backdrop aria-hidden="true">
      {isStreaming && (
        <div className="mobile-ambient-feed">
          <canvas
            ref={canvasRef}
            data-ambient-video-sample
            width={AMBIENT_SAMPLE_WIDTH}
            height={AMBIENT_SAMPLE_HEIGHT}
            className="block size-full"
            style={filterStyle}
          />
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
        </div>
      )}
      <div className="mobile-ambient-smoke" />
    </div>
  );
};
