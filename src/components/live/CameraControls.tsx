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
import type { AITurbidityResult } from '../../types/aquarium';

interface CameraControlsProps {
  zoomLevel: number;
  isRecording: boolean;
  isAIActive: boolean;
  aiLoading: boolean;
  backendAvailable: boolean;
  turbidityLoading: boolean;
  lastTurbidityResult: AITurbidityResult | null;
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
  isAIActive,
  aiLoading,
  backendAvailable,
  turbidityLoading,
  lastTurbidityResult,
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
        className={`camera-control-btn ${lastTurbidityResult ? 'turbidity-active' : ''}`}
        onClick={onMeasureTurbidity}
        disabled={turbidityLoading || !backendAvailable}
        title={
          !backendAvailable
            ? 'AI Backend Offline'
            : lastTurbidityResult
              ? `FNU: ${lastTurbidityResult.turbidity.fnu.toFixed(2)}`
              : 'Measure Water Clarity'
        }
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: lastTurbidityResult
            ? 'var(--color-info)'
            : backendAvailable
              ? 'rgba(15, 23, 42, 0.75)'
              : 'rgba(100, 100, 100, 0.5)',
          borderColor: lastTurbidityResult ? 'var(--color-info-light)' : 'rgba(255, 255, 255, 0.2)',
          color: lastTurbidityResult ? '#FFF' : backendAvailable ? '#FFF' : '#AAA',
          cursor: turbidityLoading || !backendAvailable ? 'not-allowed' : 'pointer'
        }}
      >
        {turbidityLoading ? <Loader2 size={16} className="anim-spin" /> : <Eye size={16} />}
      </button>

      <button
        className={`camera-control-btn ${isAIActive ? 'ai-active' : ''}`}
        onClick={onToggleAI}
        title={
          !backendAvailable
            ? 'AI Backend Offline - Click for help'
            : isAIActive
              ? 'Stop AI Analysis'
              : 'Start AI Analysis'
        }
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isAIActive
            ? 'var(--color-primary)'
            : backendAvailable
              ? 'rgba(15, 23, 42, 0.75)'
              : 'rgba(100, 100, 100, 0.5)',
          borderColor: isAIActive ? 'var(--color-primary-light)' : 'rgba(255, 255, 255, 0.2)',
          color: isAIActive ? '#FFF' : backendAvailable ? '#FFF' : '#AAA',
          cursor: 'pointer'
        }}
      >
        {aiLoading ? <Loader2 size={16} className="anim-spin" /> : <Brain size={16} />}
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
