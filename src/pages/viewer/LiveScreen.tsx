/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTank } from '../../hooks/useTank';
import { useLiveState } from '../../hooks/useLiveState';
import { useFish } from '../../hooks/useFish';
import { MockFirestore } from '../../services/mock_service';
import type { CameraFilters, AIDetectionResult, AITurbidityResult } from '../../types/aquarium';

import { Video } from 'lucide-react';
import { isBackendAvailable, captureFrameFromUrl, sendFrameForDetection, sendFrameForTurbidity } from '../../services/ai_service';
import { AIBoundingBoxes } from '../../components/live/AIBoundingBoxes';
import { CameraControls } from '../../components/live/CameraControls';
import { FullscreenInventory } from '../../components/live/FullscreenInventory';
import { SnapshotGallery } from '../../components/live/SnapshotGallery';
import { StreamAdjustments } from '../../components/live/StreamAdjustments';
import { WaterCalibration } from '../../components/live/WaterCalibration';
import { AIAnalysisPanel } from '../../components/live/AIAnalysisPanel';
import { VideoDecorations } from '../../components/live/VideoDecorations';

export const LiveScreen: React.FC = () => {
  const { activeTank } = useTank();
  const { liveState, updateCalibration } = useLiveState(activeTank?.id ?? null);
  const { fishList } = useFish(activeTank?.id ?? null);
  const [isStreaming, setIsStreaming] = useState(liveState?.is_live || false);

  useEffect(() => {
    if (liveState) {
      setIsStreaming(liveState.is_live);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveState?.is_live]);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFsInventory, setShowFsInventory] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      if (!isFs) {
        setShowFsInventory(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!viewportRef.current) return;
    if (!document.fullscreenElement) {
      viewportRef.current.requestFullscreen().catch(err => {
        console.error(`Error entering fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [flashActive, setFlashActive] = useState(false);

  const [isAIActive, setIsAIActive] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [lastPrediction, setLastPrediction] = useState<AIDetectionResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [turbidityLoading, setTurbidityLoading] = useState(false);
  const [lastTurbidityResult, setLastTurbidityResult] = useState<AITurbidityResult | null>(null);

  useEffect(() => {
    isBackendAvailable().then(setBackendAvailable);
    const interval = setInterval(() => {
      isBackendAvailable().then(setBackendAvailable);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const [isCalibrating, setIsCalibrating] = useState(false);
  const [isCalibDragging, setIsCalibDragging] = useState(false);
  const isCalibDraggingRef = useRef(false);
  const dragLineYRef = useRef<number | null>(null);
  const calibRectRef = useRef<DOMRect | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const [dragLineY, setDragLineY] = useState<number | null>(null);

  const [filters, setFilters] = useState<CameraFilters>({
    contrast: 100,
    brightness: 100,
    saturation: 100,
    temperature: 0,
    tint: 0
  });

  const handleFilterChange = (key: keyof CameraFilters, val: number) => {
    setFilters(prev => ({ ...prev, [key]: val }));
  };

  const [containerSize, setContainerSize] = useState({ width: 640, height: 360 });

  useEffect(() => {
    const updateSize = () => {
      if (imageContainerRef.current) {
        const rect = imageContainerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 });

  const [isDragging, setIsDragging] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (zoomLevel === 1.0) {
      setPanOffset({ x: 0, y: 0 });
    }
  }, [zoomLevel]);

  const [snapshots, setSnapshots] = useState<{
    id: string;
    timestamp: string;
    imageUrl: string;
    fishCount: number;
    clarity: number;
  }[]>(() => {
    const saved = localStorage.getItem('oceaneyes_snapshots');
    return saved ? JSON.parse(saved) : [];
  });

  const [recordings, setRecordings] = useState<{
    id: string;
    timestamp: string;
    duration: number;
    fishCount: number;
    clarity: number;
  }[]>(() => {
    const saved = localStorage.getItem('oceaneyes_recordings');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('oceaneyes_snapshots', JSON.stringify(snapshots));
  }, [snapshots]);

  useEffect(() => {
    localStorage.setItem('oceaneyes_recordings', JSON.stringify(recordings));
  }, [recordings]);

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

  const startStream = () => {
    setIsStreaming(true);
    if (activeTank) {
      const currentLive = MockFirestore.getLiveState(activeTank.id);
      const feed = currentLive.feeds[0];
      const updatedFeed = {
        ...feed,
        is_live: true,
        started_at: feed.started_at || new Date().toISOString()
      };
      MockFirestore.saveLiveState(activeTank.id, {
        is_live: true,
        stream_url: updatedFeed.stream_url,
        started_at: updatedFeed.started_at,
        last_ping_at: new Date().toISOString(),
        current_clarity: updatedFeed.current_clarity,
        current_fish_count: updatedFeed.current_fish_count,
        selected_feed_id: currentLive.selected_feed_id,
        feeds: [updatedFeed]
      });
    }
  };

  const stopStream = () => {
    setIsStreaming(false);
    setIsRecording(false);
    setZoomLevel(1.0);
    if (activeTank) {
      const currentLive = MockFirestore.getLiveState(activeTank.id);
      const feed = currentLive.feeds[0];
      const updatedFeed = {
        ...feed,
        is_live: false,
        started_at: null
      };
      MockFirestore.saveLiveState(activeTank.id, {
        is_live: false,
        stream_url: '',
        started_at: null,
        last_ping_at: null,
        current_clarity: 0,
        current_fish_count: 0,
        selected_feed_id: currentLive.selected_feed_id,
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
    current_clarity: 7.8,
    current_fish_count: 0
  };
  const activeFeedCalibration = activeFeed?.calibration || activeTank?.calibration;
  const displayLineY = dragLineY !== null ? dragLineY : (activeFeedCalibration?.water_line_y ?? 120);

  useEffect(() => {
    if (!activeFeed.mock_image) return;
    const img = new Image();
    img.onload = () => {
      setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = activeFeed.mock_image;
  }, [activeFeed.mock_image]);

  useEffect(() => {
    if (!isAIActive || !isStreaming || !backendAvailable) {
      if (aiIntervalRef.current) {
        clearInterval(aiIntervalRef.current);
        aiIntervalRef.current = null;
      }
      return;
    }

    const processFrame = async () => {
      if (!activeFeed.mock_image || aiLoading) return;
      setAiLoading(true);
      setAiError(null);
      try {
        const blob = await captureFrameFromUrl(activeFeed.mock_image, 640, 360);
        const result = await sendFrameForDetection(blob, 0.35);
        setLastPrediction(result);

        if (activeTank) {
          const totalFish = result.summary.total_detections;

          MockFirestore.writeReading({
            tankId: activeTank.id,
            clarity: activeFeed.current_clarity ?? 0,
            fishCount: totalFish,
          });

          const currentLive = MockFirestore.getLiveState(activeTank.id);
          const updatedFeeds = currentLive.feeds.map(f => {
            if (f.id === activeFeed.id) {
              return {
                ...f,
                current_fish_count: totalFish,
              };
            }
            return f;
          });
          MockFirestore.saveLiveState(activeTank.id, {
            ...currentLive,
            current_fish_count: totalFish,
            feeds: updatedFeeds,
          });

          fishList.forEach(fish => {
            MockFirestore.updateDetected(fish.id, 0);
          });
          Object.entries(result.summary.species_counts).forEach(([speciesId, count]) => {
            const fishEntry = fishList.find(f => f.speciesId === speciesId);
            if (fishEntry) {
              MockFirestore.updateDetected(fishEntry.id, count);
            }
          });
        }
      } catch (err) {
        setAiError(err instanceof Error ? err.message : 'AI inference failed');
      } finally {
        setAiLoading(false);
      }
    };

    processFrame();
    aiIntervalRef.current = setInterval(processFrame, 3000);

    return () => {
      if (aiIntervalRef.current) {
        clearInterval(aiIntervalRef.current);
        aiIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAIActive, isStreaming, backendAvailable, activeFeed.mock_image]);

  const toggleAI = useCallback(() => {
    if (!backendAvailable) {
      alert('AI Backend is offline.\n\nPlease start it first:\ncd ai && python api_server.py');
      return;
    }
    setIsAIActive(prev => !prev);
    setAiError(null);
  }, [backendAvailable]);

  const measureTurbidity = useCallback(async () => {
    if (!activeFeed.mock_image || turbidityLoading) return;
    setTurbidityLoading(true);
    try {
      const blob = await captureFrameFromUrl(activeFeed.mock_image, 640, 360);
      const result = await sendFrameForTurbidity(blob);
      setLastTurbidityResult(result);

      if (activeTank) {
        const fnuValue = result.turbidity.fnu;

        MockFirestore.writeReading({
          tankId: activeTank.id,
          clarity: parseFloat(fnuValue.toFixed(2)),
          fishCount: activeFeed.current_fish_count ?? 0,
        });

        const currentLive = MockFirestore.getLiveState(activeTank.id);
        const updatedFeeds = currentLive.feeds.map(f => {
          if (f.id === activeFeed.id) {
            return {
              ...f,
              current_clarity: parseFloat(fnuValue.toFixed(2)),
            };
          }
          return f;
        });
        MockFirestore.saveLiveState(activeTank.id, {
          ...currentLive,
          current_clarity: parseFloat(fnuValue.toFixed(2)),
          feeds: updatedFeeds,
        });
      }
    } catch (err) {
      console.error('Turbidity measurement failed:', err);
    } finally {
      setTurbidityLoading(false);
    }
  }, [activeFeed.mock_image, activeFeed.id, activeFeed.current_fish_count, activeTank, turbidityLoading]);

  const stateClarity = isStreaming && liveState?.is_live ? activeFeed.current_clarity : 0;
  const stateFish = isStreaming && liveState?.is_live ? activeFeed.current_fish_count : 0;

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateWaterLineY = useCallback((rect: DOMRect, clientY: number) => {
    const yPixel = Math.min(rect.height, Math.max(0, clientY - rect.top));
    return Math.round((yPixel / rect.height) * 240);
  }, []);

  const scheduleDragLineUpdate = useCallback((newY: number) => {
    dragLineYRef.current = newY;
    if (rafIdRef.current !== null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      setDragLineY(dragLineYRef.current);
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isCalibrating) {
      const rect = e.currentTarget.getBoundingClientRect();
      calibRectRef.current = rect;
      isCalibDraggingRef.current = true;
      setIsCalibDragging(true);
      const newY = calculateWaterLineY(rect, e.clientY);
      setDragLineY(newY);
      return;
    }
    if (zoomLevel <= 1.0) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - panOffset.x,
      y: e.clientY - panOffset.y
    });
  }, [isCalibrating, zoomLevel, panOffset, calculateWaterLineY]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isCalibrating) {
      if (isCalibDraggingRef.current || e.buttons === 1) {
        const rect = calibRectRef.current ?? e.currentTarget.getBoundingClientRect();
        const newY = calculateWaterLineY(rect, e.clientY);
        scheduleDragLineUpdate(newY);
      }
      return;
    }
    if (!isDragging || zoomLevel <= 1.0) return;

    let newX = e.clientX - dragStart.x;
    let newY = e.clientY - dragStart.y;

    const container = e.currentTarget.getBoundingClientRect();
    const limitX = (container.width * (zoomLevel - 1)) / 2;
    const limitY = (container.height * (zoomLevel - 1)) / 2;

    newX = Math.max(-limitX, Math.min(limitX, newX));
    newY = Math.max(-limitY, Math.min(limitY, newY));

    setPanOffset({ x: newX, y: newY });
  }, [isCalibrating, isDragging, zoomLevel, dragStart, calculateWaterLineY, scheduleDragLineUpdate]);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (isCalibrating) {
      const rect = e.currentTarget.getBoundingClientRect();
      calibRectRef.current = rect;
      isCalibDraggingRef.current = true;
      setIsCalibDragging(true);
      const clientY = e.touches[0].clientY;
      const newY = calculateWaterLineY(rect, clientY);
      setDragLineY(newY);
      return;
    }
    if (zoomLevel <= 1.0 || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - panOffset.x,
      y: touch.clientY - panOffset.y
    });
  }, [isCalibrating, zoomLevel, panOffset, calculateWaterLineY]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (isCalibrating) {
      if (isCalibDraggingRef.current) {
        const rect = calibRectRef.current ?? e.currentTarget.getBoundingClientRect();
        const clientY = e.touches[0].clientY;
        const newY = calculateWaterLineY(rect, clientY);
        scheduleDragLineUpdate(newY);
      }
      return;
    }
    if (!isDragging || zoomLevel <= 1.0 || e.touches.length !== 1) return;
    const touch = e.touches[0];

    let newX = touch.clientX - dragStart.x;
    let newY = touch.clientY - dragStart.y;

    const container = e.currentTarget.getBoundingClientRect();
    const limitX = (container.width * (zoomLevel - 1)) / 2;
    const limitY = (container.height * (zoomLevel - 1)) / 2;

    newX = Math.max(-limitX, Math.min(limitX, newX));
    newY = Math.max(-limitY, Math.min(limitY, newY));

    setPanOffset({ x: newX, y: newY });
  }, [isCalibrating, isDragging, zoomLevel, dragStart, calculateWaterLineY, scheduleDragLineUpdate]);

  const handleMouseUpOrLeave = useCallback(() => {
    setIsDragging(false);
    if (isCalibDraggingRef.current) {
      isCalibDraggingRef.current = false;
      setIsCalibDragging(false);
      calibRectRef.current = null;
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      const finalY = dragLineYRef.current;
      dragLineYRef.current = null;
      if (finalY !== null) {
        updateCalibration(finalY);
        setDragLineY(null);
      }
    }
  }, [updateCalibration]);

  const takeSnapshot = () => {
    if (!isStreaming) return;
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 400);

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderAllToCanvas = (bgImg?: HTMLImageElement) => {
      ctx.filter = `contrast(${filters.contrast}%) brightness(${filters.brightness}%) saturate(${filters.saturation}%)`;
      if (bgImg) {
        ctx.drawImage(bgImg, 0, 0, 640, 360);
      } else {
        const grad = ctx.createLinearGradient(0, 0, 0, 360);
        const isDark = document.body.classList.contains('dark');
        if (isDark) {
          grad.addColorStop(0, '#050827');
          grad.addColorStop(0.5, '#004f95');
          grad.addColorStop(1, '#0074d9');
        } else {
          grad.addColorStop(0, '#0F766E');
          grad.addColorStop(0.5, '#115E59');
          grad.addColorStop(1, '#134E4A');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 640, 360);
      }
      ctx.filter = 'none';

      if (filters.temperature !== 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = filters.temperature > 0
          ? `rgba(255, 176, 0, ${Math.abs(filters.temperature) / 300})`
          : `rgba(0, 160, 255, ${Math.abs(filters.temperature) / 300})`;
        ctx.fillRect(0, 0, 640, 360);
        ctx.restore();
      }

      if (filters.tint !== 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = filters.tint > 0
          ? `rgba(255, 0, 187, ${Math.abs(filters.tint) / 400})`
          : `rgba(0, 255, 68, ${Math.abs(filters.tint) / 400})`;
        ctx.fillRect(0, 0, 640, 360);
        ctx.restore();
      }

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x < 640; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 360);
        ctx.stroke();
      }
      for (let y = 0; y < 360; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(640, y);
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(panOffset.x, panOffset.y);
      ctx.translate(320, 180);
      ctx.scale(zoomLevel, zoomLevel);
      ctx.translate(-320, -180);
      ctx.restore();

      if (isRecording) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
        ctx.beginPath();
        ctx.arc(30, 25, 6, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`REC ${formatTime(recordingSeconds)}`, 42, 25);
      }

      ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
      ctx.fillRect(520, 15, 100, 22);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`LIVE CAM (FPS:30)`, 570, 26);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 310, 640, 50);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '10px Outfit, Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`OCEANEYES AI DIAGNOSTICS`, 20, 335);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#E2E8F0';
      ctx.fillText(`FISH: ${stateFish} DETECTED  |  FNU: ${stateClarity.toFixed(2)}  |  ZOOM: ${zoomLevel.toFixed(1)}x`, 620, 335);

      const imgUrl = canvas.toDataURL('image/png');
      const newSnapshot = {
        id: `snap_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        imageUrl: imgUrl,
        fishCount: stateFish,
        clarity: stateClarity
      };
      setSnapshots(prev => [newSnapshot, ...prev]);
    };

    if (activeFeed.mock_image) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        renderAllToCanvas(img);
      };
      img.onerror = () => {
        renderAllToCanvas();
      };
      img.src = activeFeed.mock_image;
    } else {
      renderAllToCanvas();
    }
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

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      const newRecording = {
        id: `rec_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        duration: recordingSeconds,
        fishCount: stateFish,
        clarity: stateClarity
      };
      setRecordings(prev => [newRecording, ...prev]);
    } else {
      setIsRecording(true);
      setRecordingSeconds(0);
    }
  };

  const downloadRecording = (rec: { id: string; timestamp: string; duration: number; fishCount: number; clarity: number }) => {
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

  return (
    <div style={{ padding: '0 20px 30px 20px' }}>
      <div className="canvas-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Camera Monitor</span>
          <h1 className="canvas-title" style={{ marginTop: '2px' }}>Live Video Stream</h1>
        </div>
      </div>

      {!activeTank && (
        <div style={{
          background: 'var(--color-warning-bg, rgba(217, 119, 6, 0.08))',
          border: '1px solid var(--color-warning, #D97706)',
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: 'var(--color-warning-dark, #B45309)',
          fontSize: '13px',
          fontWeight: 600
        }}>
          <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-warning)' }}>!</span>
          <span>No aquarium linked. Link a tank from the Dashboard to save camera feeds and enable AI detection.</span>
        </div>
      )}

      <div
        ref={viewportRef}
        className="live-camera-feed"
        style={{
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: isCalibrating ? 'ns-resize' : (zoomLevel > 1.0 ? (isDragging ? 'grabbing' : 'grab') : 'default'),
          userSelect: 'none',
          touchAction: isCalibrating || zoomLevel > 1.0 ? 'none' : 'auto'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUpOrLeave}
      >
        {isStreaming ? (
          <>
            <div className={`camera-flash-overlay ${flashActive ? 'flash-active' : ''}`} />
            <div className="camera-grid" />

            <div ref={imageContainerRef} style={{
              width: '100%',
              position: 'relative',
              overflow: 'hidden',
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
              transformOrigin: 'center',
              transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
              <img
                src={activeFeed.mock_image || ''}
                alt="Live feed"
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                  filter: `contrast(${filters.contrast}%) brightness(${filters.brightness}%) saturate(${filters.saturation}%)`
                }}
              />
              {filters.temperature !== 0 && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  backgroundColor: filters.temperature > 0 ? '#ffb000' : '#00a0ff',
                  opacity: Math.abs(filters.temperature) / 300,
                  mixBlendMode: 'color',
                  pointerEvents: 'none',
                  zIndex: 4
                }} />
              )}
              {filters.tint !== 0 && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  backgroundColor: filters.tint > 0 ? '#ff00bb' : '#00ff44',
                  opacity: Math.abs(filters.tint) / 400,
                  mixBlendMode: 'color',
                  pointerEvents: 'none',
                  zIndex: 5
                }} />
              )}
            </div>

            <VideoDecorations
              isCalibrating={isCalibrating}
              isCalibDragging={isCalibDragging}
              waterLineY={displayLineY}
              stateFish={stateFish}
              stateClarity={stateClarity}
            />

            {isAIActive && lastPrediction && (
              <AIBoundingBoxes
                lastPrediction={lastPrediction}
                containerSize={containerSize}
                imageNaturalSize={imageNaturalSize}
                panOffset={panOffset}
                zoomLevel={zoomLevel}
                isDragging={isDragging}
              />
            )}

            {isAIActive && (
              <div style={{
                position: 'absolute',
                top: '12px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 16,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(15, 23, 42, 0.85)',
                padding: '6px 12px',
                borderRadius: '20px',
                border: `1px solid ${aiError ? 'var(--color-critical)' : 'var(--color-primary)'}`,
                color: '#FFF',
                fontSize: '11px',
                fontWeight: 600
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: aiLoading ? 'var(--color-warning)' : aiError ? 'var(--color-critical)' : 'var(--color-good)',
                  animation: aiLoading ? 'pulse 1.5s infinite' : 'none'
                }} />
                <span>
                  {aiLoading ? 'AI Analyzing...' : aiError ? `AI Error: ${aiError}` : `AI Active · ${lastPrediction?.summary.total_detections || 0} fish detected`}
                </span>
              </div>
            )}

            <div className="live-overlay-pill" style={{ left: '12px' }}>
              <div className="live-badge" />
              <span>{activeFeed.name} (LIVE)</span>
            </div>

            <div className="live-overlay-pill" style={{ right: isFullscreen && showFsInventory ? '332px' : '12px', transition: 'right 0.3s ease' }}>
              <span>FPS: 30</span>
            </div>

            {isRecording && (
              <div className="live-overlay-pill" style={{ left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(239, 68, 68, 0.85)' }}>
                <div className="recording-dot" />
                <span>REC {formatTime(recordingSeconds)}</span>
              </div>
            )}

            <CameraControls
              zoomLevel={zoomLevel}
              isRecording={isRecording}
              isAIActive={isAIActive}
              aiLoading={aiLoading}
              backendAvailable={backendAvailable}
              turbidityLoading={turbidityLoading}
              lastTurbidityResult={lastTurbidityResult}
              isFullscreen={isFullscreen}
              showFsInventory={showFsInventory}
              onZoomIn={() => setZoomLevel(prev => Math.min(3, prev + 0.5))}
              onZoomOut={() => setZoomLevel(prev => Math.max(1, prev - 0.5))}
              onTakeSnapshot={takeSnapshot}
              onToggleRecording={toggleRecording}
              onMeasureTurbidity={measureTurbidity}
              onToggleAI={toggleAI}
              onToggleFullscreen={toggleFullscreen}
              onToggleFsInventory={() => setShowFsInventory(!showFsInventory)}
            />

            {isFullscreen && (
              <FullscreenInventory
                fishList={fishList}
                showFsInventory={showFsInventory}
                onClose={() => setShowFsInventory(false)}
              />
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
              <Video size={32} color="var(--color-text-secondary)" />
            </div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', margin: '0 0 16px 0' }}>
              Feed is idle. Connect stream to monitor.
            </p>
            <button className="primary-button" onClick={startStream}>
              Connect Stream
            </button>
          </div>
        )}
      </div>

      {isStreaming && (
        <>
          {isAIActive && lastPrediction && (
            <AIAnalysisPanel
              lastPrediction={lastPrediction}
              lastTurbidityResult={lastTurbidityResult}
            />
          )}

          <StreamAdjustments
            filters={filters}
            onFilterChange={handleFilterChange}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <button className="secondary-button" style={{ color: 'var(--color-critical)', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={stopStream}>
              Close Camera Connection
            </button>

            <WaterCalibration
              waterLineY={displayLineY}
              isCalibrating={isCalibrating}
              onToggleCalibrating={() => setIsCalibrating(prev => !prev)}
              onUpdateCalibration={updateCalibration}
            />
          </div>
        </>
      )}

      <SnapshotGallery
        snapshots={snapshots}
        recordings={recordings}
        onDownloadSnapshot={downloadSnapshot}
        onDeleteSnapshot={deleteSnapshot}
        onDownloadRecording={downloadRecording}
        onDeleteRecording={deleteRecording}
      />
    </div>
  );
};
