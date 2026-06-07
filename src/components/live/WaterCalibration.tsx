import React from 'react';
import { Ruler } from 'lucide-react';

interface WaterCalibrationProps {
  waterLineY: number;
  isCalibrating: boolean;
  onToggleCalibrating: () => void;
  onUpdateCalibration: (y: number) => void;
}

export const WaterCalibration: React.FC<WaterCalibrationProps> = ({
  waterLineY,
  isCalibrating,
  onToggleCalibrating,
  onUpdateCalibration
}) => {
  const currentPercentage = Math.round((1 - waterLineY / 240) * 100);

  const handleCalibrationChange = (pct: number) => {
    const newY = Math.round((1 - pct / 100) * 240);
    onUpdateCalibration(newY);
  };

  return (
    <div className="card-decoration" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', margin: 0, color: 'var(--color-text-primary)' }}>
          <Ruler size={16} style={{ color: 'var(--color-primary)' }} />
          <span>Water Calibration Level</span>
        </h4>
        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          background: 'var(--color-primary-light)',
          color: 'var(--color-primary-dark)',
          padding: '2px 8px',
          borderRadius: '12px'
        }}>
          {currentPercentage}% Calibrated
        </span>
      </div>

      <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: '140%', margin: 0 }}>
        {isCalibrating
          ? "Calibration Mode Active: Click and drag the dashed line directly in the camera viewport above to adjust the reference water line level."
          : "Enable drag calibration to align the camera's reference water line overlay with the physical water level inside this camera's feed."
        }
      </p>

      <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
        <button
          className={isCalibrating ? "primary-button" : "secondary-button"}
          style={{
            padding: '8px 16px',
            fontSize: '12px',
            borderRadius: '8px',
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            backgroundColor: isCalibrating ? 'var(--color-critical)' : undefined,
            color: isCalibrating ? '#FFF' : undefined,
            borderColor: isCalibrating ? 'var(--color-critical)' : undefined
          }}
          onClick={onToggleCalibrating}
        >
          {isCalibrating ? 'Done Calibrating' : 'Enable Drag Calibration'}
        </button>
        <button
          className="secondary-button"
          style={{
            padding: '8px 16px',
            fontSize: '12px',
            borderRadius: '8px',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer'
          }}
          onClick={() => handleCalibrationChange(50)}
        >
          Reset to 50%
        </button>
      </div>
    </div>
  );
};
