import React, { useRef } from 'react';
import { useTank } from '../../hooks/useTank';
import { useLiveFeed } from '../../hooks/useLiveFeed';
import { useLivePreferences } from '../../hooks/useLivePreferences';
import { useFish } from '../../hooks/useFish';
import { useFullscreen } from '../../hooks/live/useFullscreen';
import { useViewportSize } from '../../hooks/live/useViewportSize';
import { useCameraFilters } from '../../hooks/live/useCameraFilters';
import { useMediaCapture } from '../../hooks/live/useMediaCapture';
import { useAIAnalytics } from '../../hooks/live/useAIAnalytics';

import { Video } from 'lucide-react';
import { formatDuration } from '../../utils/formatters';
import { AIBoundingBoxes } from '../live/AIBoundingBoxes';
import { CameraControls } from '../live/CameraControls';
import { CameraFeed } from '../live/CameraFeed';
import type { CameraFeedHandle } from '../live/CameraFeed';
import { FullscreenInventory } from '../live/FullscreenInventory';
import { SnapshotGallery } from '../live/SnapshotGallery';
import { StreamAdjustments } from '../live/StreamAdjustments';
import { AIAnalysisPanel } from '../live/AIAnalysisPanel';
import { VideoDecorations } from '../live/VideoDecorations';
import { GlassButton } from '../shared';

interface LiveVideoSectionProps {
  tankId?: string | null;
  showStreamAdjustments?: boolean;
  showSnapshotGallery?: boolean;
}

export const LiveVideoSection: React.FC<LiveVideoSectionProps> = ({
  tankId: propTankId,
  showStreamAdjustments = true,
  showSnapshotGallery = true,
}) => {
  const { activeTank, tankId: activeTankId } = useTank();
  const tankId = propTankId ?? activeTankId;
  const { preferences, addFilterPreset, removeFilterPreset } = useLivePreferences(tankId);
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

  const { filters, temperatureOverlay, tintOverlay, handleFilterChange, saveAsDefault } = useCameraFilters({ tankId });

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
      {!activeTank && (
        <div className="
          mb-5 flex items-center gap-2.5 rounded-xl border border-warning
          bg-warning/8 px-4 py-3 text-sm font-semibold text-warning
        ">
          <span className="text-base font-extrabold text-warning">!</span>
          <span>No aquarium linked. Link a tank from the Dashboard to save camera feeds and enable AI detection.</span>
        </div>
      )}

      <div
        ref={viewportRef}
        className="
          fs-reset sticky top-0 z-20 -mx-4 -mt-4 flex h-[221px]
          w-[calc(100%+2rem)] items-center justify-center overflow-hidden
          bg-black
        "
      >
        {isStreaming ? (
          <>
            <div className={`
              camera-flash-overlay
              ${flashActive ? 'flash-active' : ''}
            `} />

            <div ref={imageContainerRef} className="shimmer relative size-full">
              <CameraFeed
                ref={cameraFeedRef}
                feed={activeFeed}
                isStreaming={isStreaming}
                isWebcam={isWebcam}
                videoRef={videoRef}
                filters={filters}
                onDimensions={handleDimensions}
                className="size-full"
                videoClassName="h-full w-full object-cover"
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
                  px-3 py-1.5 text-caption font-semibold text-white
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
                bg-[rgba(15,23,42,0.85)] px-3 py-1.5 text-caption font-semibold
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
              text-h3 font-semibold text-text-inverse shadow-primary-hover
              transition-smooth
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

          {showStreamAdjustments && (
            <StreamAdjustments
              filters={filters}
              onFilterChange={handleFilterChange}
              filterPresets={preferences.filterPresets}
              onSavePreset={addFilterPreset}
              onDeletePreset={removeFilterPreset}
            />
          )}

          {showStreamAdjustments && (
            <div className="flex justify-end">
              <GlassButton variant="outline" size="sm" onClick={saveAsDefault}>
                Save Current Filters as Default
              </GlassButton>
            </div>
          )}
        </>
      )}

      {showSnapshotGallery && (
        <SnapshotGallery
          snapshots={snapshots}
          recordings={recordings}
          onDownloadSnapshot={downloadSnapshot}
          onDeleteSnapshot={deleteSnapshot}
          onDownloadRecording={downloadRecording}
          onDeleteRecording={deleteRecording}
        />
      )}
    </div>
  );
};
