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
    <div className="bg-surface-card rounded-[20px] shadow-card border border-[rgba(13,148,136,0.02)] transition-[all_0.25s_cubic-bezier(0.4,0,0.2,1)] p-[18px_20px] flex flex-col gap-3 mb-6">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-bold flex items-center gap-1.5 m-0 text-text-main">
          <Ruler size={16} className="text-primary-dark" />
          <span>Water Calibration Level</span>
        </h4>
        <span className="text-[11px] font-semibold bg-primary-light-gradient text-primary-dark py-0.5 px-2 rounded-xl">
          {currentPercentage}% Calibrated
        </span>
      </div>

      <p className="text-xs text-text-muted leading-[1.4] m-0">
        {isCalibrating
          ? "Calibration Mode Active: Click and drag the dashed line directly in the camera viewport above to adjust the reference water line level."
          : "Enable drag calibration to align the camera's reference water line overlay with the physical water level inside this camera's feed."
        }
      </p>

      <div className="flex gap-2.5 mt-1">
        <button
          className={`flex-1 py-2 px-4 text-xs rounded-lg flex items-center justify-center gap-1.5 font-semibold cursor-pointer transition-[all_0.25s_cubic-bezier(0.4,0,0.2,1)] ${
            isCalibrating 
              ? "bg-critical text-white border border-critical" 
              : "bg-primary-gradient text-text-inv shadow-[0_4px_12px_rgba(13,148,136,0.15)] hover:bg-primary-hover-gradient hover:shadow-[0_6px_16px_rgba(13,148,136,0.25)] active:scale-[0.98]"
          }`}
          onClick={onToggleCalibrating}
        >
          {isCalibrating ? 'Done Calibrating' : 'Enable Drag Calibration'}
        </button>
        <button
          className="py-2 px-4 text-xs rounded-lg flex items-center justify-center gap-1.5 font-semibold cursor-pointer transition-[all_0.25s_cubic-bezier(0.4,0,0.2,1)] bg-surface-card text-text-muted border border-border-card hover:bg-surface-hover hover:border-text-muted"
          onClick={() => handleCalibrationChange(50)}
        >
          Reset to 50%
        </button>
      </div>
    </div>
  );
};
