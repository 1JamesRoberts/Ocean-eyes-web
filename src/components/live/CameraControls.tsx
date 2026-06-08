import React from 'react';
import {
  ZoomIn,
  ZoomOut,
  Camera,
  Square,
  Video,
  Eye,
  Brain,
  Loader2,
  Maximize,
  Minimize,
  Fish
} from 'lucide-react';


type BackendStatus = 'unknown' | 'checking' | 'online' | 'offline';

interface CameraControlsProps {
  zoomLevel: number;
  isRecording: boolean;
  isStreaming: boolean;
  isAIActive: boolean;
  aiLoading: boolean;
  backendStatus: BackendStatus;
  turbidityLoading: boolean;
  hasImageSource: boolean;
  isFullscreen: boolean;
  showFsInventory: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onTakeSnapshot: () => void;
  onToggleRecording: () => void;
  onMeasureTurbidity: () => void;
  onToggleAI: () => void;
  onToggleFullscreen: () => void;
  onToggleFsInventory: () => void;
}

export const CameraControls: React.FC<CameraControlsProps> = ({
  zoomLevel,
  isRecording,
  isStreaming,
  isAIActive,
  aiLoading,
  backendStatus,
  turbidityLoading,
  hasImageSource,
  isFullscreen,
  showFsInventory,
  onZoomIn,
  onZoomOut,
  onTakeSnapshot,
  onToggleRecording,
  onMeasureTurbidity,
  onToggleAI,
  onToggleFullscreen,
  onToggleFsInventory
}) => {
  const isChecking = backendStatus === 'checking';
  const isOnline = backendStatus === 'online';

  const btnStyle = (active: boolean, disabled: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: active
      ? 'var(--color-primary)'
      : disabled
        ? 'rgba(100, 100, 100, 0.5)'
        : 'rgba(15, 23, 42, 0.75)',
    borderColor: active ? 'var(--color-primary-light)' : 'rgba(255, 255, 255, 0.2)',
    color: active ? '#FFF' : disabled ? '#AAA' : '#FFF',
    cursor: disabled ? 'not-allowed' : 'pointer',
  });

  const getAIButtonTitle = (): string => {
    if (!isStreaming) return 'Start stream to enable AI Analysis';
    if (isChecking) return 'Checking AI Backend…';
    if (!isOnline) return 'AI Backend Offline - Click to retry';
    return isAIActive ? 'Stop AI Analysis' : 'Start AI Analysis';
  };

  const getTurbidityButtonTitle = (): string => {
    if (!isStreaming) return 'Start stream to measure turbidity';
    if (!hasImageSource) return 'No image source available';
    if (isChecking) return 'Checking AI Backend…';
    if (!isOnline) return 'AI Backend Offline - Click to retry';
    return 'Measure Water Clarity';
  };
  return (
    <div style={{
      position: 'absolute',
      bottom: '12px',
      right: isFullscreen && showFsInventory ? '332px' : '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      zIndex: 20,
      transition: 'right 0.3s ease'
    }}>
      {/* Zoom Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        padding: '2px 8px',
        gap: '6px',
        color: '#FFF',
        fontSize: '11px',
        fontWeight: 600,
        height: '40px'
      }}>
        <button
          onClick={onZoomOut}
          disabled={zoomLevel <= 1}
          style={{
            background: 'none',
            border: 'none',
            color: zoomLevel <= 1 ? 'rgba(255,255,255,0.3)' : '#FFF',
            cursor: zoomLevel <= 1 ? 'not-allowed' : 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center'
          }}
          title="Zoom Out"
        >
          <ZoomOut size={14} />
        </button>
        <span style={{ minWidth: '32px', textAlign: 'center' }}>{zoomLevel.toFixed(1)}x</span>
        <button
          onClick={onZoomIn}
          disabled={zoomLevel >= 3}
          style={{
            background: 'none',
            border: 'none',
            color: zoomLevel >= 3 ? 'rgba(255,255,255,0.3)' : '#FFF',
            cursor: zoomLevel >= 3 ? 'not-allowed' : 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center'
          }}
          title="Zoom In"
        >
          <ZoomIn size={14} />
        </button>
      </div>

      <button className="camera-control-btn" onClick={onTakeSnapshot} title="Capture Snapshot">
        <Camera size={16} />
      </button>

      <button
        className={`camera-control-btn ${isRecording ? 'recording-active' : ''}`}
        onClick={onToggleRecording}
        title={isRecording ? "Stop Recording" : "Start Recording"}
      >
        {isRecording ? <Square size={14} /> : <Video size={16} />}
      </button>

      <button
        className="camera-control-btn"
        onClick={onMeasureTurbidity}
        disabled={turbidityLoading || isChecking || !isStreaming || !hasImageSource}
        title={getTurbidityButtonTitle()}
        style={btnStyle(false, turbidityLoading || isChecking || !isStreaming || !hasImageSource)}
      >
        {turbidityLoading || isChecking ? <Loader2 size={16} className="anim-spin" /> : <Eye size={16} />}
      </button>

      <button
        className={`camera-control-btn ${isAIActive ? 'ai-active' : ''}`}
        onClick={onToggleAI}
        disabled={aiLoading || isChecking || !isStreaming}
        title={getAIButtonTitle()}
        style={btnStyle(isAIActive, aiLoading || isChecking || !isStreaming)}
      >
        {aiLoading || isChecking ? <Loader2 size={16} className="anim-spin" /> : <Brain size={16} />}
      </button>

      {isFullscreen && (
        <button
          className="camera-control-btn"
          onClick={onToggleFsInventory}
          title={showFsInventory ? "Hide Fish Inventory" : "Show Fish Inventory"}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: showFsInventory ? 'var(--color-primary)' : undefined,
            borderColor: showFsInventory ? 'var(--color-primary-light)' : undefined,
            color: showFsInventory ? '#FFF' : undefined
          }}
        >
          <Fish size={16} />
        </button>
      )}

      <button
        className="camera-control-btn"
        onClick={onToggleFullscreen}
        title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
      </button>
    </div>
  );
};
