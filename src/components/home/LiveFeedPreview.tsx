import React from 'react';
import { Video } from 'lucide-react';
import { useLiveState } from '../../hooks/useLiveState';
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
  const { liveState, saveLiveState } = useLiveState(activeTank?.id ?? null);
  const startStream = () => {
    if (activeTank && liveState) {
      const feed = liveState.feeds[0];
      const updatedFeed = {
        ...feed,
        is_live: true,
        started_at: feed.started_at || new Date().toISOString()
      };
      saveLiveState({
        ...liveState,
        is_live: true,
        stream_url: updatedFeed.stream_url,
        started_at: updatedFeed.started_at,
        last_ping_at: new Date().toISOString(),
        current_clarity: updatedFeed.current_clarity,
        current_fish_count: updatedFeed.current_fish_count,
        feeds: [updatedFeed]
      });
    }
  };

  const stopStream = () => {
    if (activeTank && liveState) {
      const feed = liveState.feeds[0];
      const updatedFeed = {
        ...feed,
        is_live: false,
        started_at: null
      };
      saveLiveState({
        ...liveState,
        is_live: false,
        stream_url: '',
        started_at: null,
        last_ping_at: null,
        current_clarity: 0,
        current_fish_count: 0,
        feeds: [updatedFeed]
      });
    }
  };

  const feeds = liveState?.feeds || [];
  const activeFeed = feeds.find(f => f.id === liveState?.selected_feed_id) || feeds[0] || {
    id: 'feed-main',
    name: 'Main View',
    stream_url: 'rtsp://oceaneyes.iot/live-stream-09',
    is_live: false,
    started_at: null,
    current_clarity: 1.2,
    current_fish_count: 0,
    mock_image: '/mock_camera_main.png'
  };
  const isWebcam = activeFeed.stream_url?.startsWith('webcam:');

  const [webcamStream, setWebcamStream] = React.useState<MediaStream | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  React.useEffect(() => {
    let activeStream: MediaStream | null = null;
    if (liveState?.is_live && isWebcam) {
      const deviceId = activeFeed.stream_url.split(':')[1];
      navigator.mediaDevices.getUserMedia({
        video: deviceId && deviceId !== 'default' ? { deviceId: { exact: deviceId } } : true
      })
      .then(stream => {
        activeStream = stream;
        setWebcamStream(stream);
      })
      .catch(err => {
        console.error('Failed to access webcam in preview:', err);
      });
    }
    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
      setWebcamStream(null);
    };
  }, [liveState?.is_live, isWebcam, activeFeed.stream_url]);

  React.useEffect(() => {
    if (videoRef.current && webcamStream) {
      videoRef.current.srcObject = webcamStream;
    }
  }, [webcamStream]);

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
        {liveState?.is_live ? (
          <>
            <div className="camera-grid" />

            {isWebcam ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block'
                }}
              />
            ) : (
              <img
                src={activeFeed.mock_image || ''}
                alt="Live feed"
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block'
                }}
              />
            )}
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

      {liveState?.is_live && (
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
