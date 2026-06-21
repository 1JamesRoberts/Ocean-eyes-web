import React, { useRef } from 'react';
import { useTank } from '../../hooks/useTank';
import { useLiveFeed } from '../../hooks/useLiveFeed';
import { useFish } from '../../hooks/useFish';
import { useFullscreen } from '../../hooks/live/useFullscreen';
import { useViewportSize } from '../../hooks/live/useViewportSize';
import { useCameraFilters } from '../../hooks/live/useCameraFilters';
import { useMediaCapture } from '../../hooks/live/useMediaCapture';
import { useAIAnalytics } from '../../hooks/live/useAIAnalytics';

import { Video } from 'lucide-react';
import { formatDuration } from '../../utils/formatters';
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
  const { activeTank, tankId } = useTank();
  const {
    liveState,
    saveLiveState,
    activeFeed,
    isWebcam,
    isStreaming,
    videoRef,
    startStream
  } = useLiveFeed(tankId);
  const { fishList } = useFish(tankId);

  const cameraFeedRef = useRef<CameraFeedHandle>(null);

  const { viewportRef, isFullscreen, showFsInventory, setShowFsInventory, toggleFullscreen } = useFullscreen();

  const { imageContainerRef, containerSize, imageNaturalSize, handleDimensions } = useViewportSize();

  const { filters, temperatureOverlay, tintOverlay, handleFilterChange } = useCameraFilters();

  const {
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
  } = useMediaCapture({
    cameraFeedRef,
    isStreaming,
    filters,
  });

  const {
    isAIActive,
    aiLoading,
    aiError,
    backendStatus,
    lastPrediction,
    lastTurbidityResult,
    turbidityLoading,
    turbidityError,
    manualDiagnosisLoading,
    lastManualDiagnosis,
    toggleAI,
    measureTurbidity,
    manualDiagnose,
    currentClarity,
    currentFishCount,
  } = useAIAnalytics({
    cameraFeedRef,
    isStreaming,
    activeFeed,
    isWebcam,
    activeTank,
    liveState,
    saveLiveState,
    tankId,
  });

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
                {temperatureOverlay && (
                  <div
                    className="
                      pointer-events-none absolute top-0 left-0 z-4 size-full
                      mix-blend-color
                    "
                    style={temperatureOverlay}
                  />
                )}
                {tintOverlay && (
                  <div
                    className="
                      pointer-events-none absolute top-0 left-0 z-5 size-full
                      mix-blend-color
                    "
                    style={tintOverlay}
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
              manualDiagnoseLoading={manualDiagnosisLoading}
              hasImageSource={isWebcam}
              isFullscreen={isFullscreen}
              showFsInventory={showFsInventory}
              onTakeSnapshot={() => takeSnapshot(currentFishCount, currentClarity)}
              onToggleRecording={() => toggleRecording(currentFishCount, currentClarity)}
              onMeasureTurbidity={measureTurbidity}
              onToggleAI={toggleAI}
              onManualDiagnose={manualDiagnose}
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
            lastManualDiagnosis={lastManualDiagnosis}
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
