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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-border-card text-[15px] font-bold text-text-main">
          <span className="flex items-center gap-1.5"><Camera size={16} /> Snapshots</span>
          <span className="text-xs text-text-muted font-medium">{snapshots.length} saved</span>
        </div>
        <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-border-card [&::-webkit-scrollbar-thumb]:rounded-full">
          {snapshots.length === 0 ? (
            <div className="text-center p-5 text-text-muted text-[13px]">
              No snapshots yet
            </div>
          ) : (
            snapshots.map(snap => (
              <div key={snap.id} className="flex bg-surface-card rounded-xl border border-border-card overflow-hidden transition-[all_0.25s_cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-0.5 hover:shadow-card">
                <div className="w-[110px] relative bg-[#020617] flex items-center justify-center shrink-0">
                  <img src={snap.imageUrl} alt="Snapshot" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 p-3 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold text-text-main">{snap.timestamp}</span>
                    <div className="text-[11px] text-text-muted mt-0.5">
                      {snap.fishCount} fish · {snap.clarity.toFixed(2)} FNU
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      className="flex items-center justify-center rounded-full bg-[rgba(15,23,42,0.75)] backdrop-blur-[8px] border border-[rgba(255,255,255,0.15)] text-white cursor-pointer transition-[all_0.25s_cubic-bezier(0.4,0,0.2,1)] hover:not-disabled:bg-primary-gradient hover:not-disabled:border-primary-light-gradient hover:not-disabled:-translate-y-0.5 active:not-disabled:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed w-7 h-7"
                      onClick={() => onDownloadSnapshot(snap)}
                      title="Download"
                    >
                      <Download size={12} />
                    </button>
                    <button
                      className="flex items-center justify-center rounded-full bg-[rgba(15,23,42,0.75)] backdrop-blur-[8px] border border-[rgba(255,255,255,0.15)] text-white cursor-pointer transition-[all_0.25s_cubic-bezier(0.4,0,0.2,1)] hover:not-disabled:bg-primary-gradient hover:not-disabled:border-primary-light-gradient hover:not-disabled:-translate-y-0.5 active:not-disabled:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed w-7 h-7"
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

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-border-card text-[15px] font-bold text-text-main">
          <span className="flex items-center gap-1.5"><Video size={16} /> Recordings</span>
          <span className="text-xs text-text-muted font-medium">{recordings.length} saved</span>
        </div>
        <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-border-card [&::-webkit-scrollbar-thumb]:rounded-full">
          {recordings.length === 0 ? (
            <div className="text-center p-5 text-text-muted text-[13px]">
              No recordings yet
            </div>
          ) : (
            recordings.map(rec => (
              <div key={rec.id} className="flex items-center justify-between p-[12px_16px] bg-surface-card rounded-xl border border-border-card transition-[all_0.25s_cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-0.5 hover:shadow-card">
                <div>
                  <span className="text-xs font-semibold text-text-main">{rec.timestamp}</span>
                  <div className="text-[11px] text-text-muted mt-0.5">
                    ⏱ {formatTime(rec.duration)} · {rec.fishCount} fish · {rec.clarity.toFixed(2)} FNU
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    className="flex items-center justify-center rounded-full bg-[rgba(15,23,42,0.75)] backdrop-blur-[8px] border border-[rgba(255,255,255,0.15)] text-white cursor-pointer transition-[all_0.25s_cubic-bezier(0.4,0,0.2,1)] hover:not-disabled:bg-primary-gradient hover:not-disabled:border-primary-light-gradient hover:not-disabled:-translate-y-0.5 active:not-disabled:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed w-7 h-7"
                    onClick={() => onDownloadRecording(rec)}
                    title="Download"
                  >
                    <Download size={12} />
                  </button>
                  <button
                    className="flex items-center justify-center rounded-full bg-[rgba(15,23,42,0.75)] backdrop-blur-[8px] border border-[rgba(255,255,255,0.15)] text-white cursor-pointer transition-[all_0.25s_cubic-bezier(0.4,0,0.2,1)] hover:not-disabled:bg-primary-gradient hover:not-disabled:border-primary-light-gradient hover:not-disabled:-translate-y-0.5 active:not-disabled:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed w-7 h-7"
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
