import React from 'react';
import {
  Camera,
  Eye,
  Brain,
  Loader2,
  Maximize,
  Minimize,
  Fish,
  Stethoscope,
} from 'lucide-react';


type BackendStatus = 'unknown' | 'checking' | 'online' | 'offline';

interface CameraControlsProps {
  isStreaming: boolean;
  isAIActive: boolean;
  aiLoading: boolean;
  backendStatus: BackendStatus;
  turbidityLoading: boolean;
  manualDiagnoseLoading: boolean;
  hasImageSource: boolean;
  isFullscreen: boolean;
  showFsInventory: boolean;
  onTakeSnapshot: () => void;
  onMeasureTurbidity: () => void;
  onToggleAI: () => void;
  onManualDiagnose: () => void;
  onToggleFullscreen: () => void;
  onToggleFsInventory: () => void;
}

export const CameraControls: React.FC<CameraControlsProps> = ({
  isStreaming,
  isAIActive,
  aiLoading,
  backendStatus,
  turbidityLoading,
  manualDiagnoseLoading,
  hasImageSource,
  isFullscreen,
  showFsInventory,
  onTakeSnapshot,
  onMeasureTurbidity,
  onToggleAI,
  onManualDiagnose,
  onToggleFullscreen,
  onToggleFsInventory,
}) => {
  const isChecking = backendStatus === 'checking';
  const isOnline = backendStatus === 'online';

  const getButtonClasses = ({
    active = false,
    disabled = false,
    pulse = false,
  }: {
    active?: boolean;
    disabled?: boolean;
    pulse?: boolean;
  } = {}): string => {
    const base = `
      hero-overlay-pill size-8 shrink-0 cursor-pointer p-0
      focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white
    `;

    if (disabled) {
      return `${base} cursor-not-allowed opacity-35`;
    }
    if (active) {
      return `${base} [&_svg]:!text-white [&_svg]:drop-shadow-[0_0_5px_white] ${pulse ? 'animate-pulse-ai' : ''}`;
    }
    return base;
  };

  const getAIButtonTitle = (): string => {
    if (!isStreaming) return 'Start stream to enable AI Analysis';
    if (isChecking) return 'Checking AI Backend…';
    if (!isOnline) return 'AI Backend Offline - Click to retry';
    return isAIActive ? 'Stop AI Analysis' : 'Start AI Analysis';
  };

  const getDiagnoseButtonTitle = (): string => {
    if (!isStreaming) return 'Start stream to enable LLM diagnosis';
    if (isChecking) return 'Checking AI Backend…';
    if (!isOnline) return 'AI Backend Offline';
    return 'Run LLM Fish Health Diagnosis';
  };

  const getTurbidityButtonTitle = (): string => {
    if (!isStreaming) return 'Start stream to measure turbidity';
    if (!hasImageSource) return 'No image source available';
    if (isChecking) return 'Checking AI Backend…';
    if (!isOnline) return 'AI Backend Offline - Click to retry';
    return 'Measure Water Clarity';
  };

  return (
    <div
      className="
        pointer-events-auto absolute bottom-3 z-20 flex items-center gap-2
        transition-[right] duration-300
      "
      style={{
        right: isFullscreen && showFsInventory ? '332px' : '16px',
      }}
    >
      <button
        type="button"
        className={getButtonClasses()}
        onClick={onTakeSnapshot}
        title="Capture Snapshot"
        aria-label="Capture Snapshot"
      >
        <Camera size={14} />
      </button>

      <button
        type="button"
        onClick={onMeasureTurbidity}
        disabled={turbidityLoading || isChecking || !isStreaming || !hasImageSource}
        title={getTurbidityButtonTitle()}
        aria-label={getTurbidityButtonTitle()}
        className={getButtonClasses({
          disabled: turbidityLoading || isChecking || !isStreaming || !hasImageSource,
        })}
      >
        {turbidityLoading || isChecking ? (
          <Loader2
            size={14}
            className="
              animate-spin
            "
          />
        ) : (
          <Eye size={14} />
        )}
      </button>

      <button
        type="button"
        onClick={onToggleAI}
        disabled={aiLoading || isChecking || !isStreaming}
        title={getAIButtonTitle()}
        aria-label={getAIButtonTitle()}
        className={getButtonClasses({
          active: isAIActive,
          disabled: aiLoading || isChecking || !isStreaming,
          pulse: isAIActive,
        })}
      >
        {aiLoading || isChecking ? <Loader2 size={14} className="animate-spin" /> : <Brain size={14} />}
      </button>

      <button
        type="button"
        onClick={onManualDiagnose}
        disabled={manualDiagnoseLoading || aiLoading || isChecking || !isStreaming}
        title={getDiagnoseButtonTitle()}
        aria-label={getDiagnoseButtonTitle()}
        className={getButtonClasses({
          disabled: manualDiagnoseLoading || aiLoading || isChecking || !isStreaming,
        })}
      >
        {manualDiagnoseLoading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Stethoscope size={14} />
        )}
      </button>

      {isFullscreen && (
        <button
          type="button"
          onClick={onToggleFsInventory}
          title={showFsInventory ? 'Hide Fish Inventory' : 'Show Fish Inventory'}
          aria-label={showFsInventory ? 'Hide Fish Inventory' : 'Show Fish Inventory'}
          className={getButtonClasses({ active: showFsInventory })}
        >
          <Fish size={14} />
        </button>
      )}

      <button
        type="button"
        onClick={onToggleFullscreen}
        title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        className={getButtonClasses()}
      >
        {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
      </button>
    </div>
  );
};
