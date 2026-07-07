import React, { useRef } from 'react';
import { useTank } from '../../hooks/useTank';
import { useLiveFeed } from '../../hooks/useLiveFeed';
import { useFullscreen } from '../../hooks/live/useFullscreen';
import { useCameraFilters } from '../../hooks/live/useCameraFilters';
import { useMediaCapture } from '../../hooks/live/useMediaCapture';
import { useAIAnalytics } from '../../hooks/live/useAIAnalytics';

import { formatDuration } from '../../utils/formatters';
import { CameraControls } from '../live/CameraControls';
import { CameraFeed } from '../live/CameraFeed';
import type { CameraFeedHandle } from '../live/CameraFeed';
import { SnapshotGallery } from '../live/SnapshotGallery';
import { StreamAdjustments } from '../live/StreamAdjustments';
import { AIAnalysisPanel } from '../live/AIAnalysisPanel';

interface LiveVideoSectionProps {
  tankId?: string | null;
  showStreamAdjustments?: boolean;
  showSnapshotGallery?: boolean;
}

const RecordingBadge: React.FC<{ recordingSeconds: number }> = ({ recordingSeconds }) => (
  <div className="
    absolute top-4 left-1/2 z-10 flex -translate-x-1/2 items-center
    gap-1.5 rounded-[20px] border border-[rgba(255,255,255,0.08)]
    bg-[rgba(239,68,68,0.85)] px-3 py-1.5 text-xs font-semibold
    text-white backdrop-blur-md
  ">
    <div className="size-2 animate-recording-blink rounded-full bg-critical" />
    <span>REC {formatDuration(recordingSeconds)}</span>
  </div>
);

export const LiveVideoSection: React.FC<LiveVideoSectionProps> = ({
  tankId: propTankId,
  showStreamAdjustments = true,
  showSnapshotGallery = true,
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

  const cameraFeedRef = useRef<CameraFeedHandle>(null);

  const { viewportRef, isFullscreen, showFsInventory, setShowFsInventory, toggleFullscreen } = useFullscreen();

  const { filters, handleFilterChange } = useCameraFilters({ tankId });

  const {
    snapshots,
    recordings,
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
    backendStatus,
    lastPrediction,
    lastTurbidityResult,
    turbidityLoading,
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

      {isStreaming && (
        <div
          ref={viewportRef}
          className="relative z-30 -mt-[92px] h-16"
        >
          <div className="sr-only">
            <CameraFeed
              ref={cameraFeedRef}
              feed={activeFeed}
              isStreaming={isStreaming}
              isWebcam={isWebcam}
              videoRef={videoRef}
              filters={filters}
            />
          </div>

          {isRecording && (
            <RecordingBadge recordingSeconds={recordingSeconds} />
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
        </div>
      )}

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
            />
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
