import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTank } from '../../hooks/useTank';
import { useLiveFeed } from '../../hooks/useLiveFeed';
import { useFish } from '../../hooks/useFish';
import { useFullscreen } from '../../hooks/live/useFullscreen';
import { useViewportSize } from '../../hooks/live/useViewportSize';
import { useMediaCapture } from '../../hooks/live/useMediaCapture';
import { useAIAnalytics } from '../../hooks/live/useAIAnalytics';

import { formatDuration } from '../../utils/formatters';
import { AIBoundingBoxes } from '../live/AIBoundingBoxes';
import { CameraControls } from '../live/CameraControls';
import { CameraFeed } from '../live/CameraFeed';
import type { CameraFeedHandle } from '../live/CameraFeed';
import { FullscreenInventory } from '../live/FullscreenInventory';
import { AIAnalysisPanel } from '../live/AIAnalysisPanel';
import { useHeroActionLayer } from '../shared/HeroActionLayerContext';
import type { CameraFilters } from '../../types/aquarium';

interface LiveVideoSectionProps {
  tankId?: string | null;
  filters: CameraFilters;
  temperatureOverlay: { backgroundColor: string; opacity: number } | null;
  tintOverlay: { backgroundColor: string; opacity: number } | null;
}

const RecordingBadge: React.FC<{ recordingSeconds: number }> = ({ recordingSeconds }) => (
  <div className="
    absolute top-4 left-1/2 z-10 flex -translate-x-1/2 items-center
    gap-1.5 rounded-[20px] border border-[rgba(255,255,255,0.08)]
    bg-[rgba(239,68,68,0.85)] px-3 py-1.5 type-caption
    text-white backdrop-blur-md
  ">
    <div className="size-2 animate-recording-blink rounded-full bg-critical" />
    <span>REC {formatDuration(recordingSeconds)}</span>
  </div>
);

const TurbidityErrorBadge: React.FC<{ error: string }> = ({ error }) => (
  <div
    className="
      absolute top-11 left-1/2 z-16 flex -translate-x-1/2 items-center
      gap-1.5 rounded-[20px] border border-critical
      bg-[rgba(15,23,42,0.85)] px-3 py-1.5 type-caption-inverse
      text-white
    "
  >
    <div className="size-2 rounded-full bg-critical" />
    <span>{`Turbidity Error: ${error}`}</span>
  </div>
);

export const LiveVideoSection: React.FC<LiveVideoSectionProps> = ({
  tankId: propTankId,
  filters,
  temperatureOverlay,
  tintOverlay,
}) => {
  const { activeTank, tankId: activeTankId } = useTank();
  const tankId = propTankId ?? activeTankId;
  const {
    liveState,
    saveLiveState,
    activeFeed,
    isWebcam,
    isStreaming,
    videoRef,
  } = useLiveFeed();
  const { fishList } = useFish(tankId);

  const cameraFeedRef = useRef<CameraFeedHandle>(null);
  const heroActionLayer = useHeroActionLayer();

  const { viewportRef, isFullscreen, showFsInventory, setShowFsInventory, toggleFullscreen } = useFullscreen();

  const { imageContainerRef, containerSize, imageNaturalSize, handleDimensions } = useViewportSize();

  const {
    flashActive,
    isRecording,
    recordingSeconds,
    takeSnapshot,
    toggleRecording,
  } = useMediaCapture({
    cameraFeedRef,
    isStreaming,
    filters,
  });

  const {
    isAIActive,
    aiLoading,
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

  const cameraControls = (
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
  );

  return (
    <div className="flex flex-col gap-6">
      {!activeTank && (
        <div className="
          mb-5 flex items-center gap-2.5 rounded-xl border border-warning
          bg-warning/8 px-4 py-3 type-body text-warning
        ">
          <span className="type-strong text-warning">!</span>
          <span>No aquarium linked. Link a tank from the Dashboard to save camera feeds and enable AI detection.</span>
        </div>
      )}

      {isStreaming && (
        <div
          ref={viewportRef}
            className={`
              z-30 overflow-hidden transition-[height] duration-300
              ${isFullscreen
                ? 'relative h-screen bg-black'
                : 'pointer-events-none fixed top-0 left-1/2 h-[var(--mobile-hero-height)] w-[var(--mobile-frame-width)] max-w-full -translate-x-1/2'
              }
            `}
          >
          <div
            ref={imageContainerRef}
            className={`
              shimmer
              ${isFullscreen ? 'absolute inset-0 size-full' : 'sr-only'}
            `}
          >
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

          {isFullscreen && (
            <>
              <div
                className={`
                  camera-flash-overlay
                  ${flashActive ? 'flash-active' : ''}
                `}
              />

              {isAIActive && lastPrediction && (
                <AIBoundingBoxes
                  lastPrediction={lastPrediction}
                  containerSize={containerSize}
                  imageNaturalSize={imageNaturalSize}
                />
              )}

              {turbidityError && (
                <TurbidityErrorBadge error={turbidityError} />
              )}
            </>
          )}

          {isFullscreen && (
            <FullscreenInventory
              fishList={fishList}
              showFsInventory={showFsInventory}
              onClose={() => setShowFsInventory(false)}
            />
          )}

          {isRecording && (
            <RecordingBadge recordingSeconds={recordingSeconds} />
          )}

          {isFullscreen && cameraControls}
        </div>
      )}

      {isStreaming && !isFullscreen && heroActionLayer && createPortal(cameraControls, heroActionLayer)}

      {isStreaming && (
        <>
          <AIAnalysisPanel
            lastPrediction={lastPrediction}
            lastTurbidityResult={lastTurbidityResult}
            lastManualDiagnosis={lastManualDiagnosis}
          />

        </>
      )}
    </div>
  );
};
