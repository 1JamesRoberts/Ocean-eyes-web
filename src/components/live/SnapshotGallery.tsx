import React from 'react';
import { Download, Trash2, Camera, Video } from 'lucide-react';
import { DashboardCard } from '../shared/DashboardCard';
import { EmptyState } from '../shared/EmptyState';

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

import { formatDuration } from '../../utils/formatters';

export const SnapshotGallery: React.FC<SnapshotGalleryProps> = ({
  snapshots,
  recordings,
  onDownloadSnapshot,
  onDeleteSnapshot,
  onDownloadRecording,
  onDeleteRecording
}) => {
  return (
    <div className="
      mt-6 grid grid-cols-1 gap-6
      md:grid-cols-2
    ">
      <div className="flex flex-col gap-3">
        <div className="
          flex items-center justify-between border-b border-border-card pb-2
          text-[15px] font-bold text-text-main
        ">
          <span className="flex items-center gap-1.5"><Camera size={16} /> Snapshots</span>
          <span className="text-xs font-medium text-text-muted">{snapshots.length} saved</span>
        </div>
        <div className="
          flex max-h-[380px] flex-col gap-3 overflow-y-auto pr-1
          [&::-webkit-scrollbar]:w-1.5
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb]:bg-border-card
        ">
          {snapshots.length === 0 ? (
            <EmptyState message="No snapshots yet" size="sm" />
          ) : (
            snapshots.map(snap => (
              <DashboardCard
                key={snap.id}
                padding="compact"
                className="flex overflow-hidden rounded-xl border-border-card"
              >
                <div className="
                  relative flex w-[110px] shrink-0 items-center justify-center
                  bg-camera-bg
                ">
                  <img src={snap.imageUrl} alt="Snapshot" className="
                    size-full object-cover
                  " />
                </div>
                <div className="flex flex-1 flex-col justify-between p-3">
                  <div>
                    <span className="text-xs font-semibold text-text-main">{snap.timestamp}</span>
                    <div className="mt-0.5 text-[11px] text-text-muted">
                      {snap.fishCount} fish · {snap.clarity.toFixed(2)} FNU
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      className="
                        flex size-7 cursor-pointer items-center justify-center
                        rounded-full border border-[rgba(255,255,255,0.15)]
                        bg-[rgba(15,23,42,0.75)] text-white backdrop-blur-sm
                        transition-smooth
                        hover:not-disabled:-translate-y-0.5
                        hover:not-disabled:border-primary-dark/50
                        hover:not-disabled:bg-primary-gradient
                        active:not-disabled:translate-y-0
                        disabled:cursor-not-allowed disabled:opacity-40
                      "
                      onClick={() => onDownloadSnapshot(snap)}
                      title="Download"
                    >
                      <Download size={12} />
                    </button>
                    <button
                      className="
                        flex size-7 cursor-pointer items-center justify-center
                        rounded-full border border-[rgba(255,255,255,0.15)]
                        bg-[rgba(15,23,42,0.75)] text-white backdrop-blur-sm
                        transition-smooth
                        hover:not-disabled:-translate-y-0.5
                        hover:not-disabled:border-primary-dark/50
                        hover:not-disabled:bg-primary-gradient
                        active:not-disabled:translate-y-0
                        disabled:cursor-not-allowed disabled:opacity-40
                      "
                      onClick={() => onDeleteSnapshot(snap.id)}
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </DashboardCard>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="
          flex items-center justify-between border-b border-border-card pb-2
          text-[15px] font-bold text-text-main
        ">
          <span className="flex items-center gap-1.5"><Video size={16} /> Recordings</span>
          <span className="text-xs font-medium text-text-muted">{recordings.length} saved</span>
        </div>
        <div className="
          flex max-h-[380px] flex-col gap-3 overflow-y-auto pr-1
          [&::-webkit-scrollbar]:w-1.5
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb]:bg-border-card
        ">
          {recordings.length === 0 ? (
            <EmptyState message="No recordings yet" size="sm" />
          ) : (
            recordings.map(rec => (
              <DashboardCard
                key={rec.id}
                padding="compact"
                className="
                  flex items-center justify-between rounded-xl
                  border-border-card px-4 py-3
                "
              >
                <div>
                  <span className="text-xs font-semibold text-text-main">{rec.timestamp}</span>
                  <div className="mt-0.5 text-[11px] text-text-muted">
                    ⏱ {formatDuration(rec.duration)} · {rec.fishCount} fish · {rec.clarity.toFixed(2)} FNU
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    className="
                      flex size-7 cursor-pointer items-center justify-center
                      rounded-full border border-[rgba(255,255,255,0.15)]
                      bg-[rgba(15,23,42,0.75)] text-white backdrop-blur-sm
                      transition-smooth
                      hover:not-disabled:-translate-y-0.5
                      hover:not-disabled:border-primary-dark/50
                      hover:not-disabled:bg-primary-gradient
                      active:not-disabled:translate-y-0
                      disabled:cursor-not-allowed disabled:opacity-40
                    "
                    onClick={() => onDownloadRecording(rec)}
                    title="Download"
                  >
                    <Download size={12} />
                  </button>
                  <button
                    className="
                      flex size-7 cursor-pointer items-center justify-center
                      rounded-full border border-[rgba(255,255,255,0.15)]
                      bg-[rgba(15,23,42,0.75)] text-white backdrop-blur-sm
                      transition-smooth
                      hover:not-disabled:-translate-y-0.5
                      hover:not-disabled:border-primary-dark/50
                      hover:not-disabled:bg-primary-gradient
                      active:not-disabled:translate-y-0
                      disabled:cursor-not-allowed disabled:opacity-40
                    "
                    onClick={() => onDeleteRecording(rec.id)}
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </DashboardCard>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
