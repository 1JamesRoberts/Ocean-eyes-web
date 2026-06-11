import React from 'react';
import { Video } from 'lucide-react';
import { useCameraFeed } from '../../hooks/useCameraFeed';
import { CameraFeed } from '../live/CameraFeed';
import type { TankBrief } from '../../types/aquarium';

interface LiveFeedPreviewProps {
  activeTank: TankBrief | undefined;
  displayClarity: number;
  displayFishCount: number;
  onViewAdvanced: () => void;
}

export const LiveFeedPreview: React.FC<LiveFeedPreviewProps> = ({
  activeTank,
  displayClarity,
  displayFishCount,
  onViewAdvanced
}) => {
  const { liveState, activeFeed, startStream, stopStream } = useCameraFeed(activeTank?.id ?? null);
  const isStreaming = liveState?.is_live ?? false;

  return (
    <div className="card-decoration" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Video size={16} style={{ color: 'var(--color-primary)' }} />
          <span>Live Feed Monitor</span>
        </h3>
      </div>

      <div
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
          border: '1px solid var(--color-border)'
        }}
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

            <div className="live-overlay-pill" style={{ left: '8px', top: '8px', padding: '3px 6px', fontSize: '9px' }}>
              <div className="live-badge" />
              <span>{activeFeed.name}</span>
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
              onClick={startStream}
            >
              Connect Stream
            </button>
          </div>
        )}
      </div>

      {isStreaming && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
          <button
            className="secondary-button"
            style={{ flex: 1, padding: '8px', fontSize: '12px', borderRadius: '8px', color: 'var(--color-critical)' }}
            onClick={stopStream}
          >
            Disconnect Stream
          </button>
          <button
            className="primary-button"
            style={{ flex: 1, padding: '8px', fontSize: '12px', borderRadius: '8px' }}
            onClick={onViewAdvanced}
          >
            Advanced Controls
          </button>
        </div>
      )}
    </div>
  );
};
