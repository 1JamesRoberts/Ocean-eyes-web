import React from 'react';

interface VideoDecorationsProps {
  isCalibrating: boolean;
  isCalibDragging: boolean;
  waterLineY: number;
  stateFish: number;
  stateClarity: number;
}

export const VideoDecorations: React.FC<VideoDecorationsProps> = ({
  isCalibrating,
  isCalibDragging,
  waterLineY,
  stateFish,
  stateClarity
}) => {
  return (
    <>
      {/* Water Calibration Line Overlay — only visible during calibration */}
      {isCalibrating && (
        <div style={{
          position: 'absolute',
          top: `${Math.min(100, Math.max(0, (waterLineY / 240) * 100))}%`,
          left: 0,
          width: '100%',
          height: '2px',
          borderTop: '2px dashed var(--color-critical)',
          zIndex: 10,
          transition: isCalibDragging ? 'none' : 'top 0.1s ease-out'
        }}>
          <span style={{
            position: 'absolute',
            right: '10px',
            top: '-18px',
            fontSize: '9px',
            color: '#FFF',
            background: 'var(--color-critical)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontWeight: 600,
            boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)'
          }}>
            DRAG TO CALIBRATE
          </span>
        </div>
      )}

      {/* Bottom-left Telemetry Badges */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        left: '12px',
        display: 'flex',
        gap: '12px',
        zIndex: 10
      }}>
        <div style={{ background: 'rgba(15, 23, 42, 0.75)', padding: '6px 12px', borderRadius: '12px', fontSize: '11px', color: '#FFF' }}>
          <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>FISH COUNT</span>
          <strong style={{ fontSize: '14px' }}>{stateFish} detected</strong>
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.75)', padding: '6px 12px', borderRadius: '12px', fontSize: '11px', color: '#FFF' }}>
          <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>FNU</span>
          <strong style={{ fontSize: '14px', color: 'var(--color-info)' }}>{stateClarity.toFixed(2)}</strong>
        </div>
      </div>
    </>
  );
};
