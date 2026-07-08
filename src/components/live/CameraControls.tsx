import React from 'react';
import {
  Camera,
  Square,
  Video,
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
  isRecording: boolean;
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
  onToggleRecording: () => void;
  onMeasureTurbidity: () => void;
  onToggleAI: () => void;
  onManualDiagnose: () => void;
  onToggleFullscreen: () => void;
  onToggleFsInventory: () => void;
}

export const CameraControls: React.FC<CameraControlsProps> = ({
  isRecording,
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
  onToggleRecording,
  onMeasureTurbidity,
  onToggleAI,
  onManualDiagnose,
  onToggleFullscreen,
  onToggleFsInventory
}) => {
  const isChecking = backendStatus === 'checking';
  const isOnline = backendStatus === 'online';

  const getBtnClasses = (active: boolean, disabled: boolean, isPulseClass = ''): string => {
    const base = "flex items-center justify-center rounded-full backdrop-blur-[8px] border text-white transition-smooth w-10 h-10";
    if (active) {
      return `${base} bg-primary-gradient border-primary-dark/50 text-white cursor-pointer ${isPulseClass}`;
    }
    if (disabled) {
      return `${base} bg-[rgba(100,100,100,0.5)] border-[rgba(255,255,255,0.2)] text-[#AAA] cursor-not-allowed`;
    }
    return `${base} bg-[rgba(15,23,42,0.75)] border-[rgba(255,255,255,0.15)] text-white cursor-pointer hover:bg-primary-gradient hover:border-primary-dark/50 hover:-translate-y-0.5 active:translate-y-0`;
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
        pointer-events-auto absolute bottom-0 z-20 flex items-center gap-2
        transition-[right] duration-300
      "
      style={{
        right: isFullscreen && showFsInventory ? '332px' : '12px',
        bottom: isFullscreen ? '12px' : '0',
      }}
    >
      <button 
        className={getBtnClasses(false, false)} 
        onClick={onTakeSnapshot} 
        title="Capture Snapshot"
      >
        <Camera size={16} />
      </button>

      <button
        className={getBtnClasses(isRecording, false, 'bg-critical border-white/30 animate-pulse-recording')}
        onClick={onToggleRecording}
        title={isRecording ? "Stop Recording" : "Start Recording"}
      >
        {isRecording ? <Square size={14} /> : <Video size={16} />}
      </button>

      <button
        onClick={onMeasureTurbidity}
        disabled={turbidityLoading || isChecking || !isStreaming || !hasImageSource}
        title={getTurbidityButtonTitle()}
        className={getBtnClasses(false, turbidityLoading || isChecking || !isStreaming || !hasImageSource)}
      >
        {turbidityLoading || isChecking ? <Loader2 size={16} className="
          animate-spin
        " /> : <Eye size={16} />}
      </button>

      <button
        onClick={onToggleAI}
        disabled={aiLoading || isChecking || !isStreaming}
        title={getAIButtonTitle()}
        className={getBtnClasses(isAIActive, aiLoading || isChecking || !isStreaming, 'animate-pulse-ai')}
      >
        {aiLoading || isChecking ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
      </button>

      <button
        onClick={onManualDiagnose}
        disabled={manualDiagnoseLoading || aiLoading || isChecking || !isStreaming}
        title={getDiagnoseButtonTitle()}
        className={getBtnClasses(false, manualDiagnoseLoading || aiLoading || isChecking || !isStreaming)}
      >
        {manualDiagnoseLoading ? <Loader2 size={16} className="animate-spin" /> : <Stethoscope size={16} />}
      </button>

      {isFullscreen && (
        <button
          onClick={onToggleFsInventory}
          title={showFsInventory ? "Hide Fish Inventory" : "Show Fish Inventory"}
          className={getBtnClasses(showFsInventory, false)}
        >
          <Fish size={16} />
        </button>
      )}

      <button
        onClick={onToggleFullscreen}
        title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        className={getBtnClasses(false, false)}
      >
        {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
      </button>
    </div>
  );
};
