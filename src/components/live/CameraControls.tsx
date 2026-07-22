import React from 'react';
import {
  Eye,
  Brain,
  Loader2,
  Maximize,
  Minimize,
  Fish,
  Stethoscope,
  SwitchCamera,
} from 'lucide-react';
import type { CameraFacingMode } from '../../models/services/cameraConstraints';


type BackendStatus = 'unknown' | 'checking' | 'online' | 'offline';

interface CameraControlsProps {
  isStreaming: boolean;
  isAIActive: boolean;
  aiLoading: boolean;
  backendStatus: BackendStatus;
  turbidityLoading: boolean;
  manualDiagnoseLoading: boolean;
  hasImageSource: boolean;
  cameraFacingMode: CameraFacingMode;
  isCameraSwitching: boolean;
  canSwitchCamera: boolean;
  isFullscreen: boolean;
  showFsInventory: boolean;
  onSwitchCamera: () => void;
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
  cameraFacingMode,
  isCameraSwitching,
  canSwitchCamera,
  isFullscreen,
  showFsInventory,
  onSwitchCamera,
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
      hero-overlay-pill relative size-8 shrink-0 cursor-pointer p-0
      before:absolute before:-inset-x-1 before:-inset-y-1.5 before:content-['']
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
    if (isChecking) return 'Checking on-device AI…';
    if (!isOnline) return 'On-device AI unavailable - Click to retry';
    return isAIActive ? 'Stop AI Analysis' : 'Start AI Analysis';
  };

  const getDiagnoseButtonTitle = (): string => {
    return 'Disease diagnosis is disabled in the on-device prototype';
  };

  const getTurbidityButtonTitle = (): string => {
    if (!isStreaming) return 'Start stream to measure turbidity';
    if (!hasImageSource) return 'No image source available';
    if (isChecking) return 'Checking on-device AI…';
    if (!isOnline) return 'On-device AI unavailable - Click to retry';
    return 'Measure Water Clarity';
  };

  const cameraSwitchTitle = isCameraSwitching
    ? 'Switching camera…'
    : cameraFacingMode === 'environment'
      ? 'Switch to Front Camera'
      : 'Switch to Rear Camera';

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
        className={getButtonClasses({
          disabled: !isStreaming || !canSwitchCamera || isCameraSwitching,
        })}
        onClick={onSwitchCamera}
        disabled={!isStreaming || !canSwitchCamera || isCameraSwitching}
        title={cameraSwitchTitle}
        aria-label={cameraSwitchTitle}
      >
        {isCameraSwitching ? (
          <Loader2 size={14} strokeWidth={2.5} className="animate-spin" />
        ) : (
          <SwitchCamera size={14} strokeWidth={2.5} />
        )}
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
            strokeWidth={2.5}
            className="
              animate-spin
            "
          />
        ) : (
          <Eye size={14} strokeWidth={2.5} />
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
        {aiLoading || isChecking ? <Loader2 size={14} strokeWidth={2.5} className="animate-spin" /> : <Brain size={14} strokeWidth={2.5} />}
      </button>

      <button
        type="button"
        onClick={onManualDiagnose}
        disabled
        title={getDiagnoseButtonTitle()}
        aria-label={getDiagnoseButtonTitle()}
        className={getButtonClasses({
          disabled: true,
        })}
      >
        {manualDiagnoseLoading ? (
          <Loader2 size={14} strokeWidth={2.5} className="animate-spin" />
        ) : (
          <Stethoscope size={14} strokeWidth={2.5} />
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
          <Fish size={14} strokeWidth={2.5} />
        </button>
      )}

      <button
        type="button"
        onClick={onToggleFullscreen}
        title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        className={getButtonClasses()}
      >
        {isFullscreen ? <Minimize size={14} strokeWidth={2.5} /> : <Maximize size={14} strokeWidth={2.5} />}
      </button>
    </div>
  );
};
