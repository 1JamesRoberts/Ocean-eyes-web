import React from 'react';
import {
  Camera,
  Eye,
  Brain,
  Loader2,
  Maximize,
  Minimize,
  Fish,
  Stethoscope
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
  onToggleFsInventory
}) => {
  const isChecking = backendStatus === 'checking';
  const isOnline = backendStatus === 'online';

  const getBtnClasses = (active: boolean, disabled: boolean, isPulseClass = ''): string => {
    const base = "relative flex size-7 items-center justify-center rounded-full border-0 bg-black/40 p-0 text-white/85 shadow-[0_1px_3px_rgba(0,0,0,0.28)] backdrop-blur-md transition-smooth";
    if (active) {
      return `${base} cursor-pointer text-brand-bright hover:text-white ${isPulseClass}`;
    }
    if (disabled) {
      return `${base} text-white/35 cursor-not-allowed`;
    }
    return `${base} cursor-pointer hover:text-white active:scale-95`;
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
        pointer-events-auto absolute bottom-3 z-20 flex items-center gap-3
        transition-[right] duration-300
      "
      style={{
        right: isFullscreen && showFsInventory ? '332px' : '16px',
      }}
    >
      <button 
        className={getBtnClasses(false, false)} 
        onClick={onTakeSnapshot} 
        title="Capture Snapshot"
      >
        <Camera size={14} />
      </button>

      <button
        onClick={onMeasureTurbidity}
        disabled={turbidityLoading || isChecking || !isStreaming || !hasImageSource}
        title={getTurbidityButtonTitle()}
        className={getBtnClasses(false, turbidityLoading || isChecking || !isStreaming || !hasImageSource)}
      >
        {turbidityLoading || isChecking ? <Loader2 size={14} className="
          animate-spin
        " /> : <Eye size={14} />}
      </button>

      <button
        onClick={onToggleAI}
        disabled={aiLoading || isChecking || !isStreaming}
        title={getAIButtonTitle()}
        className={getBtnClasses(isAIActive, aiLoading || isChecking || !isStreaming, 'animate-pulse-ai')}
      >
        {aiLoading || isChecking ? <Loader2 size={14} className="animate-spin" /> : <Brain size={14} />}
      </button>

      <button
        onClick={onManualDiagnose}
        disabled={manualDiagnoseLoading || aiLoading || isChecking || !isStreaming}
        title={getDiagnoseButtonTitle()}
        className={getBtnClasses(false, manualDiagnoseLoading || aiLoading || isChecking || !isStreaming)}
      >
        {manualDiagnoseLoading ? <Loader2 size={14} className="animate-spin" /> : <Stethoscope size={14} />}
      </button>

      {isFullscreen && (
        <button
          onClick={onToggleFsInventory}
          title={showFsInventory ? "Hide Fish Inventory" : "Show Fish Inventory"}
          className={getBtnClasses(showFsInventory, false)}
        >
          <Fish size={14} />
        </button>
      )}

      <button
        onClick={onToggleFullscreen}
        title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        className={getBtnClasses(false, false)}
      >
        {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
      </button>
    </div>
  );
};
