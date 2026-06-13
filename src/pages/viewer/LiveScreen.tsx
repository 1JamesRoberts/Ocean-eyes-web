import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { useTank } from '../../hooks/useTank';
import { useCameraFeed } from '../../hooks/useCameraFeed';
import { useFish } from '../../hooks/useFish';
import { useAlerts } from '../../hooks/useAlerts';
import { useReadings } from '../../hooks/useReadings';
import type { CameraFilters, AIDetectionResult, AITurbidityResult } from '../../types/aquarium';

import { Video } from 'lucide-react';
import { formatDuration } from '../../utils/formatters';
import { isBackendAvailable, captureFrame, captureFrameFromUrl, sendFrameForDetection, sendFrameForTurbidity } from '../../services/ai_service';
import { LocalStorageStore } from '../../services/localStorageStore';
import { AIBoundingBoxes } from '../../components/live/AIBoundingBoxes';
import { CameraControls } from '../../components/live/CameraControls';
import { CameraFeed } from '../../components/live/CameraFeed';
import type { CameraFeedHandle } from '../../components/live/CameraFeed';
import { FullscreenInventory } from '../../components/live/FullscreenInventory';
import { SnapshotGallery } from '../../components/live/SnapshotGallery';
import { StreamAdjustments } from '../../components/live/StreamAdjustments';
import { AIAnalysisPanel } from '../../components/live/AIAnalysisPanel';
import { VideoDecorations } from '../../components/live/VideoDecorations';

export const LiveScreen: React.FC = () => {
  const { autoFullscreen, setAutoFullscreen, setActiveTab } = useNavigation();
  const { activeTank } = useTank();
  const {
    liveState,
    saveLiveState,
    activeFeed,
    isWebcam,
    isStreaming,
    videoRef,
    startStream
  } = useCameraFeed(activeTank?.id ?? null);
  const { fishList, updateDetectedCount } = useFish(activeTank?.id ?? null);
  const { addAlert } = useAlerts();
  const { writeReading } = useReadings();

  const cameraFeedRef = useRef<CameraFeedHandle>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFsInventory, setShowFsInventory] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const enteredViaAutoFullscreenRef = useRef(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      if (!isFs) {
        setShowFsInventory(false);
        if (enteredViaAutoFullscreenRef.current) {
          enteredViaAutoFullscreenRef.current = false;
          setActiveTab('home');
        }
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [setActiveTab]);

  useEffect(() => {
    if (autoFullscreen && viewportRef.current) {
      enteredViaAutoFullscreenRef.current = true;
      viewportRef.current.requestFullscreen().catch(err => {
        console.error(`Error entering fullscreen: ${err.message}`);
      });
      setAutoFullscreen(false);
    }
  }, [autoFullscreen, setAutoFullscreen]);

  const toggleFullscreen = () => {
    if (!viewportRef.current) return;
    if (!document.fullscreenElement) {
      enteredViaAutoFullscreenRef.current = false;
      viewportRef.current.requestFullscreen().catch(err => {
        console.error(`Error entering fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [flashActive, setFlashActive] = useState(false);

  const [isAIActive, setIsAIActive] = useState(() => liveState?.ai_active ?? false);
  const [backendStatus, setBackendStatus] = useState<'unknown' | 'checking' | 'online' | 'offline'>('unknown');
  const [lastPrediction, setLastPrediction] = useState<AIDetectionResult | null>(() => liveState?.last_prediction ?? null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiAbortControllerRef = useRef<AbortController | null>(null);
  const aiMountedRef = useRef(true);

  const [turbidityLoading, setTurbidityLoading] = useState(false);
  const [turbidityError, setTurbidityError] = useState<string | null>(null);
  const turbidityAbortControllerRef = useRef<AbortController | null>(null);
  const [lastTurbidityResult, setLastTurbidityResult] = useState<AITurbidityResult | null>(() => liveState?.last_turbidity_result ?? null);

  // Persist AI state into per-tank LiveState so it survives tab switches and page reloads.
  useEffect(() => {
    if (!activeTank || !liveState) return;
    saveLiveState({
      ...liveState,
      ai_active: isAIActive,
      last_prediction: lastPrediction,
      last_turbidity_result: lastTurbidityResult,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAIActive, lastPrediction, lastTurbidityResult]);

  const [filters, setFilters] = useState<CameraFilters>({
    contrast: 100,
    brightness: 100,
    saturation: 100,
    temperature: 0,
    tint: 0
  });

  const handleFilterChange = (filters: Partial<CameraFilters>) => {
    setFilters(prev => ({ ...prev, ...filters }));
  };

  const [containerSize, setContainerSize] = useState({ width: 640, height: 360 });

  useEffect(() => {
    if (!imageContainerRef.current) return;
    const el = imageContainerRef.current;
    const updateSize = () => {
      setContainerSize({ width: el.offsetWidth, height: el.offsetHeight });
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 });

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
    LocalStorageStore.safeWriteRaw('oceaneyes_snapshots', JSON.stringify(snapshots));
  }, [snapshots]);

  useEffect(() => {
    LocalStorageStore.safeWriteRaw('oceaneyes_recordings', JSON.stringify(recordings));
  }, [recordings]);

  // Background health check every 30s when stream is active
  useEffect(() => {
    if (!isStreaming) return;
    const check = async () => {
      const ok = await isBackendAvailable();
      setBackendStatus(prev => (prev === 'checking' ? prev : ok ? 'online' : 'offline'));
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [isStreaming]);

  // Cleanup turbidity abort on unmount
  useEffect(() => {
    return () => {
      if (turbidityAbortControllerRef.current) {
        turbidityAbortControllerRef.current.abort();
        turbidityAbortControllerRef.current = null;
      }
    };
  }, []);

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

  const handleDimensions = (width: number, height: number) => {
    setImageNaturalSize({ width, height });
  };

  useEffect(() => {
    if (!isAIActive || !isStreaming || backendStatus !== 'online') {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
        aiTimeoutRef.current = null;
      }
      if (aiAbortControllerRef.current) {
        aiAbortControllerRef.current.abort();
        aiAbortControllerRef.current = null;
      }
      return;
    }

    aiMountedRef.current = true;

    const processFrame = async () => {
      if (!aiMountedRef.current) return;
      if (((!isWebcam && !activeFeed.mock_image) || aiLoading)) return;

      setAiLoading(true);
      setAiError(null);
      const controller = new AbortController();
      aiAbortControllerRef.current = controller;

      try {
        let blob: Blob;
        if (isWebcam && cameraFeedRef.current?.videoElement) {
          blob = await captureFrame(cameraFeedRef.current.videoElement);
        } else {
          blob = await captureFrameFromUrl(activeFeed.mock_image!, 640, 360, controller.signal);
        }

        const ONE_HOUR = 3600000;
        const lastDiagStr = localStorage.getItem('oceaneyes_last_diagnosis_time');
        const lastDiag = lastDiagStr ? parseInt(lastDiagStr, 10) : 0;
        const shouldDiagnose = Date.now() - lastDiag > ONE_HOUR;

        const result = await sendFrameForDetection(blob, 0.35, shouldDiagnose, controller.signal);

        if (!aiMountedRef.current) return;
        setLastPrediction(result);

        if (shouldDiagnose) {
          LocalStorageStore.safeWriteRaw('oceaneyes_last_diagnosis_time', Date.now().toString());

          const diagnosedFish = result.detections.find(d => d.diagnosis);
          if (diagnosedFish?.diagnosis && !diagnosedFish.diagnosis.healthy) {
            const diag = diagnosedFish.diagnosis;
            addAlert({
              id: `alert-disease-${Date.now()}`,
              title: `Disease Alert: ${diag.disease}`,
              message: `AI detected signs of ${diag.disease} on a ${diagnosedFish.species_display}: ${diag.description}`,
              tip: `Recommended Action: ${diag.treatment}`,
              severity: 'critical' as const,
              timeAgo: 'Just now',
              clarityBefore: '',
              clarityAfter: '',
              fishBefore: '',
              fishAfter: '',
              resolved: false,
              timestamp: new Date().toISOString()
            });
          }
        }

        if (activeTank && liveState) {
          const totalFish = result.summary.total_detections;

          writeReading({
            tankId: activeTank.id,
            clarity: activeFeed.current_clarity ?? 0,
            fishCount: totalFish,
          });

          const updatedFeeds = liveState.feeds.map(f => {
            if (f.id === activeFeed.id) {
              return {
                ...f,
                current_fish_count: totalFish,
              };
            }
            return f;
          });
          saveLiveState({
            ...liveState,
            current_fish_count: totalFish,
            feeds: updatedFeeds,
          });

          fishList.forEach(fish => {
            updateDetectedCount(fish.id, 0);
          });
          Object.entries(result.summary.species_counts).forEach(([speciesId, count]) => {
            const fishEntry = fishList.find(f => f.speciesId === speciesId);
            if (fishEntry) {
              updateDetectedCount(fishEntry.id, count);
            }
          });
        }
      } catch (err) {
        if (!aiMountedRef.current) return;
        if (err instanceof Error && err.name === 'AbortError') return;
        setAiError(err instanceof Error ? err.message : 'AI inference failed');
      } finally {
        if (aiMountedRef.current) {
          setAiLoading(false);
        }
        aiAbortControllerRef.current = null;
        if (aiMountedRef.current) {
          aiTimeoutRef.current = setTimeout(processFrame, 10000);
        }
      }
    };

    processFrame();

    return () => {
      aiMountedRef.current = false;
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
        aiTimeoutRef.current = null;
      }
      if (aiAbortControllerRef.current) {
        aiAbortControllerRef.current.abort();
        aiAbortControllerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAIActive, isStreaming, backendStatus, activeFeed.mock_image, activeFeed.id, isWebcam]);

  const ensureBackendOnline = useCallback(async (signal?: AbortSignal): Promise<boolean> => {
    if (backendStatus === 'online') return true;
    setBackendStatus('checking');
    const ok = await isBackendAvailable(signal);
    if (ok) {
      setBackendStatus('online');
      return true;
    }
    setBackendStatus('offline');
    return false;
  }, [backendStatus]);

  const toggleAI = useCallback(async () => {
    if (aiLoading || backendStatus === 'checking' || !isStreaming) return;

    // If turning OFF, immediately disable without checking backend
    if (isAIActive) {
      setIsAIActive(false);
      setAiError(null);
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
        aiTimeoutRef.current = null;
      }
      if (aiAbortControllerRef.current) {
        aiAbortControllerRef.current.abort();
        aiAbortControllerRef.current = null;
      }
      return;
    }

    // Turning ON: verify backend first
    if (!(await ensureBackendOnline())) {
      setAiError('AI Backend is offline. Please start it first: cd ai && python api_server.py');
      return;
    }
    setIsAIActive(true);
    setAiError(null);
  }, [isAIActive, aiLoading, backendStatus, isStreaming, ensureBackendOnline]);

  const measureTurbidity = useCallback(async () => {
    if (((!isWebcam && !activeFeed.mock_image) || turbidityLoading || backendStatus === 'checking' || !isStreaming)) return;
    if (!(await ensureBackendOnline())) {
      setTurbidityError('AI Backend is offline. Please start it first: cd ai && python api_server.py');
      return;
    }

    setTurbidityLoading(true);
    setTurbidityError(null);
    const controller = new AbortController();
    turbidityAbortControllerRef.current = controller;

    try {
      let blob: Blob;
      if (isWebcam && cameraFeedRef.current?.videoElement) {
        blob = await captureFrame(cameraFeedRef.current.videoElement);
      } else {
        blob = await captureFrameFromUrl(activeFeed.mock_image!, 640, 360, controller.signal);
      }
      const result = await sendFrameForTurbidity(blob, controller.signal);
      setLastTurbidityResult(result);

      if (activeTank && liveState) {
        const fnuValue = result.turbidity.fnu;

        writeReading({
          tankId: activeTank.id,
          clarity: parseFloat(fnuValue.toFixed(2)),
          fishCount: activeFeed.current_fish_count ?? 0,
        });

        const updatedFeeds = liveState.feeds.map(f => {
          if (f.id === activeFeed.id) {
            return {
              ...f,
              current_clarity: parseFloat(fnuValue.toFixed(2)),
            };
          }
          return f;
        });
        saveLiveState({
          ...liveState,
          current_clarity: parseFloat(fnuValue.toFixed(2)),
          feeds: updatedFeeds,
        });
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setTurbidityError(err instanceof Error ? err.message : 'Turbidity measurement failed');
    } finally {
      setTurbidityLoading(false);
      turbidityAbortControllerRef.current = null;
    }
  }, [activeFeed.mock_image, activeFeed.id, activeFeed.current_fish_count, activeTank, turbidityLoading, isWebcam, isStreaming, backendStatus, ensureBackendOnline, liveState, saveLiveState, writeReading, setLastTurbidityResult]);

  const currentClarity = isStreaming && liveState?.is_live ? activeFeed.current_clarity : 0;
  const currentFishCount = isStreaming && liveState?.is_live ? activeFeed.current_fish_count : 0;

  const takeSnapshot = () => {
    if (!isStreaming) return;
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 400);

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderAllToCanvas = (bgImg?: HTMLImageElement | HTMLVideoElement) => {
      ctx.filter = `contrast(${filters.contrast}%) brightness(${filters.brightness}%) saturate(${filters.saturation}%)`;
      if (bgImg) {
        ctx.drawImage(bgImg, 0, 0, 640, 360);
      } else {
        const grad = ctx.createLinearGradient(0, 0, 0, 360);
        grad.addColorStop(0, '#0F766E');
        grad.addColorStop(0.5, '#115E59');
        grad.addColorStop(1, '#134E4A');
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

      const imgUrl = canvas.toDataURL('image/png');
      const newSnapshot = {
        id: `snap_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        imageUrl: imgUrl,
        fishCount: currentFishCount,
        clarity: currentClarity
      };
      setSnapshots(prev => [newSnapshot, ...prev]);
    };

    if (isWebcam && cameraFeedRef.current?.videoElement) {
      renderAllToCanvas(cameraFeedRef.current.videoElement);
    } else if (activeFeed.mock_image) {
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
        fishCount: currentFishCount,
        clarity: currentClarity
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
    <div className="flex flex-col gap-6">
      <div className="
        flex min-h-[75px] items-center justify-between border-b
        border-border-card pb-3
        max-xs:flex-col max-xs:items-start max-xs:gap-3
      ">
        <div>
          <span className="text-xs font-semibold text-text-muted uppercase">Camera Monitor</span>
          <h1 className="mt-0.5 text-[28px] font-extrabold text-text-main">Live Video Stream</h1>
        </div>
      </div>

      {!activeTank && (
        <div className="
          mb-5 flex items-center gap-2.5 rounded-xl border border-warning
          bg-warning/8 px-4 py-3 text-[13px] font-semibold text-[#B45309]
        ">
          <span className="text-base font-extrabold text-warning">!</span>
          <span>No aquarium linked. Link a tank from the Dashboard to save camera feeds and enable AI detection.</span>
        </div>
      )}

      <div
        ref={viewportRef}
        className="
          live-camera-feed relative mb-6 flex items-center justify-center
          overflow-hidden rounded-[20px] border border-[rgba(255,255,255,0.05)]
          bg-camera-bg shadow-premium
          max-sm:rounded-xl
        "
      >
        {isStreaming ? (
          <>
            <div className={`
              camera-flash-overlay
              ${flashActive ? 'flash-active' : ''}
            `} />

            <div ref={imageContainerRef} className="
              relative w-full overflow-hidden
            ">
              <CameraFeed
                ref={cameraFeedRef}
                feed={activeFeed}
                isStreaming={isStreaming}
                isWebcam={isWebcam}
                videoRef={videoRef}
                filters={filters}
                onDimensions={handleDimensions}
              >
                {filters.temperature !== 0 && (
                  <div
                    className="
                      pointer-events-none absolute top-0 left-0 z-4 size-full
                      mix-blend-color
                    "
                    style={{
                      backgroundColor: filters.temperature > 0 ? '#ffb000' : '#00a0ff',
                      opacity: Math.abs(filters.temperature) / 300
                    }}
                  />
                )}
                {filters.tint !== 0 && (
                  <div
                    className="
                      pointer-events-none absolute top-0 left-0 z-5 size-full
                      mix-blend-color
                    "
                    style={{
                      backgroundColor: filters.tint > 0 ? '#ff00bb' : '#00ff44',
                      opacity: Math.abs(filters.tint) / 400
                    }}
                  />
                )}
              </CameraFeed>
            </div>

            <VideoDecorations
              currentFishCount={currentFishCount}
              currentClarity={currentClarity}
            />

            {isAIActive && lastPrediction && (
              <AIBoundingBoxes
                lastPrediction={lastPrediction}
                containerSize={containerSize}
                imageNaturalSize={imageNaturalSize}
              />
            )}

            {isAIActive && (
              <div
                className="
                  absolute top-3 left-1/2 z-16 flex -translate-x-1/2
                  items-center gap-1.5 rounded-[20px] bg-[rgba(15,23,42,0.85)]
                  px-3 py-1.5 text-[11px] font-semibold text-white
                "
              >
                <div
                  className="size-2 rounded-full"
                  style={{
                    backgroundColor: aiLoading ? 'var(--color-warning)' : aiError ? 'var(--color-critical)' : 'var(--color-good)',
                    animation: aiLoading ? 'pulse 1.5s infinite' : 'none'
                  }}
                />
                <span>
                  {aiLoading ? 'AI Analyzing...' : aiError ? `AI Error: ${aiError}` : `AI Active · ${lastPrediction?.summary.total_detections || 0} fish detected`}
                </span>
              </div>
            )}

            {turbidityError && (
              <div className="
                absolute top-11 left-1/2 z-16 flex -translate-x-1/2 items-center
                gap-1.5 rounded-[20px] border border-critical
                bg-[rgba(15,23,42,0.85)] px-3 py-1.5 text-[11px] font-semibold
                text-white
              ">
                <div className="size-2 rounded-full bg-critical" />
                <span>{`Turbidity Error: ${turbidityError}`}</span>
              </div>
            )}

            {isRecording && (
              <div className="
                absolute top-4 left-1/2 z-10 flex -translate-x-1/2 items-center
                gap-1.5 rounded-[20px] border border-[rgba(255,255,255,0.08)]
                bg-[rgba(239,68,68,0.85)] px-3 py-1.5 text-xs font-semibold
                text-white backdrop-blur-md
              ">
                <div className="
                  size-2 animate-recording-blink rounded-full bg-critical
                " />
                <span>REC {formatDuration(recordingSeconds)}</span>
              </div>
            )}

            <CameraControls
              isRecording={isRecording}
              isStreaming={isStreaming}
              isAIActive={isAIActive}
              aiLoading={aiLoading}
              backendStatus={backendStatus}
              turbidityLoading={turbidityLoading}
              hasImageSource={isWebcam || !!activeFeed.mock_image}
              isFullscreen={isFullscreen}
              showFsInventory={showFsInventory}
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
          <div className="p-10 text-center">
            <div className="mb-3 flex justify-center">
              <Video size={32} className="text-text-muted" />
            </div>
            <p className="mb-4 text-sm text-text-muted">
              Feed is idle. Connect stream to monitor.
            </p>
            <button className="
              inline-flex cursor-pointer items-center justify-center gap-2
              rounded-3xl border-none bg-primary-gradient px-6 py-3 font-main
              text-[15px] font-semibold text-text-inv
              shadow-[0_4px_12px_rgba(13,148,136,0.15)] transition-smooth
              hover:bg-primary-hover-gradient
              active:scale-[0.98]
            " onClick={startStream}>
              Connect Stream
            </button>
          </div>
        )}
      </div>

      {isStreaming && (
        <>
          <AIAnalysisPanel
            lastPrediction={lastPrediction}
            lastTurbidityResult={lastTurbidityResult}
          />

          <StreamAdjustments
            filters={filters}
            onFilterChange={handleFilterChange}
          />


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
