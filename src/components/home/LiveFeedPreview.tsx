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
  const { liveState, activeFeed: _activeFeed, startStream } = useCameraFeed(activeTank?.id ?? null);
  const isStreaming = liveState?.is_live ?? false;
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
      className="card-decoration"
      style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', cursor: 'pointer' }}
      onClick={onViewAdvanced}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Video size={16} style={{ color: 'var(--color-primary)' }} />
          <span>Live Feed Monitor</span>
        </h3>
      </div>

      <div
        ref={videoContainerRef}
        className="live-camera-feed"
        style={{
          position: 'relative',
          width: '100%',
          borderRadius: '12px',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'var(--color-background)',
          border: '1px solid var(--color-border)',
          cursor: 'pointer'
        }}
        onClick={handleVideoClick}
        onMouseEnter={() => setIsHoveringVideo(true)}
        onMouseLeave={() => setIsHoveringVideo(false)}
      >
        {isStreaming ? (
          <>
            <CameraFeed
              tankId={activeTank?.id ?? null}
              className="w-full"
              idlePlaceholder={
                <div className="flex flex-col items-center justify-center gap-2 py-8">
                  <Video size={24} color="var(--color-text-secondary)" />
                  <p className="text-text-secondary text-xs">Feed is idle. Connect stream to monitor.</p>
                </div>
              }
            />
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              overflow: 'hidden'
            }}>
            </div>

            <div style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              display: 'flex',
              gap: '6px',
              zIndex: 10
            }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.85)', padding: '3px 6px', borderRadius: '6px', fontSize: '9px', color: '#FFF' }}>
                <strong>{displayFishCount} fish</strong>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.85)', padding: '3px 6px', borderRadius: '6px', fontSize: '9px', color: '#FFF' }}>
                <strong style={{ color: 'var(--color-info)' }}>{displayClarity.toFixed(2)} FNU</strong>
              </div>
            </div>

            {isHoveringVideo && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: 'rgba(15, 23, 42, 0.55)',
                  zIndex: 20,
                  transition: 'opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  opacity: 1,
                  pointerEvents: 'none'
                }}
              >
                <Maximize2 size={24} color="#FFF" style={{ opacity: 0.9 }} />
                <span style={{ color: '#FFF', fontSize: '11px', fontWeight: 600, opacity: 0.9 }}>
                  Click for fullscreen
                </span>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '12px' }}>
            <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>
              <Video size={24} color="var(--color-text-secondary)" />
            </div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '12px', margin: '0 0 10px 0' }}>
              Feed is idle. Connect stream to monitor.
            </p>
            <button
              className="primary-button"
              style={{ padding: '6px 12px', fontSize: '12px', margin: '0 auto' }}
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
