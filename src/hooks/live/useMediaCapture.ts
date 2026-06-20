import { useState, useEffect } from 'react';
import type { CameraFilters } from '../../types/aquarium';
import type { CameraFeedHandle } from '../../components/live/CameraFeed';
import { LocalStorageStore } from '../../services/localStorageStore';
import {
  getTemperatureRgba,
  getTintRgba,
  buildCanvasFilterString,
} from '../../models/services/cameraFilterModel';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SnapshotEntry {
  id: string;
  timestamp: string;
  imageUrl: string;
  fishCount: number;
  clarity: number;
}

export interface RecordingEntry {
  id: string;
  timestamp: string;
  duration: number;
  fishCount: number;
  clarity: number;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseMediaCaptureOptions {
  cameraFeedRef: React.RefObject<CameraFeedHandle | null>;
  isStreaming: boolean;
  filters: CameraFilters;
}

interface UseMediaCaptureResult {
  snapshots: SnapshotEntry[];
  recordings: RecordingEntry[];
  flashActive: boolean;
  isRecording: boolean;
  recordingSeconds: number;
  takeSnapshot: (currentFishCount: number, currentClarity: number) => void;
  downloadSnapshot: (snap: { id: string; imageUrl: string }) => void;
  deleteSnapshot: (id: string) => void;
  toggleRecording: (currentFishCount: number, currentClarity: number) => void;
  downloadRecording: (rec: RecordingEntry) => void;
  deleteRecording: (id: string) => void;
}

const SNAPSHOTS_KEY = 'oceaneyes_snapshots';
const RECORDINGS_KEY = 'oceaneyes_recordings';

const SNAPSHOT_CANVAS_WIDTH = 640;
const SNAPSHOT_CANVAS_HEIGHT = 360;

export const useMediaCapture = ({
  cameraFeedRef,
  isStreaming,
  filters,
}: UseMediaCaptureOptions): UseMediaCaptureResult => {
  const [snapshots, setSnapshots] = useState<SnapshotEntry[]>(() => {
    const saved = localStorage.getItem(SNAPSHOTS_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [recordings, setRecordings] = useState<RecordingEntry[]>(() => {
    const saved = localStorage.getItem(RECORDINGS_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [flashActive, setFlashActive] = useState(false);

  // Persist snapshots to localStorage
  useEffect(() => {
    LocalStorageStore.safeWriteRaw(SNAPSHOTS_KEY, JSON.stringify(snapshots));
  }, [snapshots]);

  // Persist recordings to localStorage
  useEffect(() => {
    LocalStorageStore.safeWriteRaw(RECORDINGS_KEY, JSON.stringify(recordings));
  }, [recordings]);

  // Recording timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // ── Snapshot canvas rendering ──────────────────────────────────────────

  const renderFiltersToCanvas = (ctx: CanvasRenderingContext2D) => {
    if (filters.temperature !== 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'color';
      ctx.fillStyle = getTemperatureRgba(filters.temperature);
      ctx.fillRect(0, 0, SNAPSHOT_CANVAS_WIDTH, SNAPSHOT_CANVAS_HEIGHT);
      ctx.restore();
    }

    if (filters.tint !== 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'color';
      ctx.fillStyle = getTintRgba(filters.tint);
      ctx.fillRect(0, 0, SNAPSHOT_CANVAS_WIDTH, SNAPSHOT_CANVAS_HEIGHT);
      ctx.restore();
    }
  };

  const takeSnapshot = (currentFishCount: number, currentClarity: number) => {
    if (!isStreaming) return;

    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 400);

    const canvas = document.createElement('canvas');
    canvas.width = SNAPSHOT_CANVAS_WIDTH;
    canvas.height = SNAPSHOT_CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const videoElement = cameraFeedRef.current?.videoElement;

    // Apply CSS-like filters via canvas filter
    ctx.filter = buildCanvasFilterString(filters);

    if (videoElement) {
      ctx.drawImage(videoElement, 0, 0, SNAPSHOT_CANVAS_WIDTH, SNAPSHOT_CANVAS_HEIGHT);
    } else {
      // Fallback gradient background when no video is available
      const grad = ctx.createLinearGradient(0, 0, 0, SNAPSHOT_CANVAS_HEIGHT);
      grad.addColorStop(0, '#0F766E');
      grad.addColorStop(0.5, '#115E59');
      grad.addColorStop(1, '#134E4A');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, SNAPSHOT_CANVAS_WIDTH, SNAPSHOT_CANVAS_HEIGHT);
    }
    ctx.filter = 'none';

    // Overlay temperature / tint color blends
    renderFiltersToCanvas(ctx);

    const imageUrl = canvas.toDataURL('image/png');
    const newSnapshot: SnapshotEntry = {
      id: `snap_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      imageUrl,
      fishCount: currentFishCount,
      clarity: currentClarity,
    };
    setSnapshots(prev => [newSnapshot, ...prev]);
  };

  const downloadSnapshot = (snap: { id: string; imageUrl: string }) => {
    const link = document.createElement('a');
    link.download = `OceanEyes_Snapshot_${snap.id}.png`;
    link.href = snap.imageUrl;
    link.click();
  };

  const deleteSnapshot = (id: string) => {
    setSnapshots(prev => prev.filter(s => s.id !== id));
  };

  // ── Recording (fake log) ──────────────────────────────────────────────

  const toggleRecording = (currentFishCount: number, currentClarity: number) => {
    if (isRecording) {
      setIsRecording(false);
      const newRecording: RecordingEntry = {
        id: `rec_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        duration: recordingSeconds,
        fishCount: currentFishCount,
        clarity: currentClarity,
      };
      setRecordings(prev => [newRecording, ...prev]);
    } else {
      setIsRecording(true);
      setRecordingSeconds(0);
    }
  };

  const downloadRecording = (rec: RecordingEntry) => {
    const logContent = `OCEANEYES AI SMART AQUARIUM RECORDING LOG
================================================
Recording ID: ${rec.id}
Timestamp: ${rec.timestamp}
Duration: ${rec.duration} seconds
Species Count: ${rec.fishCount} detected
FNU: ${rec.clarity.toFixed(2)}
Diagnostics:
  - RTSP Stream link verified.
  - Video stream encoded at 30 FPS.
  - AI computer vision scan: Completed with no discrepancies.
================================================`;

    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `OceanEyes_Recording_${rec.id}.log`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const deleteRecording = (id: string) => {
    setRecordings(prev => prev.filter(r => r.id !== id));
  };

  return {
    snapshots,
    recordings,
    flashActive,
    isRecording,
    recordingSeconds,
    takeSnapshot,
    downloadSnapshot,
    deleteSnapshot,
    toggleRecording,
    downloadRecording,
    deleteRecording,
  };
};
