import React from 'react';
import { Download, Trash2, Camera, Video } from 'lucide-react';

interface SnapshotGalleryProps {
  snapshots: {
    id: string;
    timestamp: string;
    imageUrl: string;
    fishCount: number;
    clarity: number;
  }[];
  recordings: {
    id: string;
    timestamp: string;
    duration: number;
    fishCount: number;
    clarity: number;
  }[];
  onDownloadSnapshot: (snapshot: { id: string; imageUrl: string }) => void;
  onDeleteSnapshot: (id: string) => void;
  onDownloadRecording: (recording: { id: string; timestamp: string; duration: number; fishCount: number; clarity: number }) => void;
  onDeleteRecording: (id: string) => void;
}

export const SnapshotGallery: React.FC<SnapshotGalleryProps> = ({
  snapshots,
  recordings,
  onDownloadSnapshot,
  onDeleteSnapshot,
  onDownloadRecording,
  onDeleteRecording
}) => {
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="camera-gallery-grid">
      <div className="gallery-section">
        <div className="gallery-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Camera size={16} /> Snapshots</span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{snapshots.length} saved</span>
        </div>
        <div className="gallery-list">
          {snapshots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
              No snapshots yet
            </div>
          ) : (
            snapshots.map(snap => (
              <div key={snap.id} className="snapshot-card">
                <div className="snapshot-thumb-container">
                  <img src={snap.imageUrl} alt="Snapshot" className="snapshot-thumb" />
                </div>
                <div className="snapshot-info">
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{snap.timestamp}</span>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      {snap.fishCount} fish · {snap.clarity.toFixed(2)} FNU
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="camera-control-btn"
                      style={{ width: '28px', height: '28px' }}
                      onClick={() => onDownloadSnapshot(snap)}
                      title="Download"
                    >
                      <Download size={12} />
                    </button>
                    <button
                      className="camera-control-btn"
                      style={{ width: '28px', height: '28px' }}
                      onClick={() => onDeleteSnapshot(snap.id)}
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="gallery-section">
        <div className="gallery-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Video size={16} /> Recordings</span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{recordings.length} saved</span>
        </div>
        <div className="gallery-list">
          {recordings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
              No recordings yet
            </div>
          ) : (
            recordings.map(rec => (
              <div key={rec.id} className="recording-card">
                <div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{rec.timestamp}</span>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    ⏱ {formatTime(rec.duration)} · {rec.fishCount} fish · {rec.clarity.toFixed(2)} FNU
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    className="camera-control-btn"
                    style={{ width: '28px', height: '28px' }}
                    onClick={() => onDownloadRecording(rec)}
                    title="Download"
                  >
                    <Download size={12} />
                  </button>
                  <button
                    className="camera-control-btn"
                    style={{ width: '28px', height: '28px' }}
                    onClick={() => onDeleteRecording(rec.id)}
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
