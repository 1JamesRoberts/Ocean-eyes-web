import React, { useState } from 'react';
import { useTank } from '../../hooks/useTank';
import { useLiveState } from '../../hooks/useLiveState';

interface ScreenProps {
  onNavigate: (screen: 'welcome' | 'qr' | 'calibration' | 'active') => void;
}

export const MonitorCalibrationScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { activeTank: contextActiveTank, tanks } = useTank();
  const activeTank = contextActiveTank || (tanks.length > 0 ? tanks[0] : null);
  const { updateCalibration } = useLiveState(activeTank?.id ?? null);
  const [lineY, setLineY] = useState(activeTank?.calibration?.water_line_y || 120);
  const [saved, setSaved] = useState(false);
  const staticWaterLineY = activeTank?.calibration?.water_line_y || 120; // Static camera feed reference

  const handleDrag = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const y = Math.min(240, Math.max(0, clientY - rect.top));
    setLineY(y);
  };

  const handleSave = () => {
    if (activeTank) {
      updateCalibration(lineY);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onNavigate('welcome');
      }, 1500);
    }
  };

  return (
    <div style={{
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      color: '#FFFFFF',
      background: '#090D11'
    }}>
      <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '2px', color: '#E2E8F0', textAlign: 'center' }}>
        Water Line Calibration
      </h3>
      {activeTank && (
        <span style={{ fontSize: '11px', color: 'var(--color-primary)', display: 'block', textAlign: 'center', marginBottom: '8px', fontWeight: 600 }}>
          Calibrating: {activeTank.name}
        </span>
      )}
      <p style={{ fontSize: '11px', color: '#64748B', textAlign: 'center', marginBottom: '16px', lineHeight: '135%' }}>
        Drag the dotted red line visually to match the physical water surface level in your tank.
      </p>

      {/* Interactive Calibration Canvas */}
      <div 
        onMouseMove={(e) => {
          if (e.buttons === 1) handleDrag(e);
        }}
        onMouseDown={handleDrag}
        onTouchMove={handleDrag}
        style={{
          height: '240px', // Matches exactly the 240px coordinate space to prevent stretching/floating gaps at the bottom
          background: 'radial-gradient(circle at center, #1E293B 0%, #0F172A 100%)',
          borderRadius: '12px',
          border: '2px solid #1E293B',
          position: 'relative',
          cursor: 'ns-resize',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <div className="camera-grid" />
        
        {/* Static Water Body Representation of Tank (Simulating Camera Feed) */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: `${240 - staticWaterLineY}px`, // Static camera feed height
          background: 'linear-gradient(180deg, rgba(20, 184, 166, 0.35) 0%, rgba(13, 148, 136, 0.55) 100%)',
          borderTop: '2px solid rgba(255, 255, 255, 0.5)',
          zIndex: 1,
          pointerEvents: 'none'
        }}>
          {/* Bubbles */}
        </div>

        {/* Sand/Substrate Bed */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '24px',
          background: 'linear-gradient(0deg, #0F172A 0%, #1E293B 100%)',
          borderTop: '1px solid #334155',
          zIndex: 2,
          pointerEvents: 'none'
        }} />

        {/* Glass Tank Frame Reflection */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          boxShadow: 'inset 0 0 20px rgba(45, 212, 191, 0.15)',
          border: '2px solid rgba(45, 212, 191, 0.25)',
          borderRadius: '10px',
          pointerEvents: 'none',
          zIndex: 15
        }} />

        {/* Dynamic Water Level Line Indicator */}
        <div style={{
          position: 'absolute',
          top: `${lineY}px`,
          left: 0,
          width: '100%',
          height: '2px',
          borderTop: '2px dashed var(--color-critical)',
          zIndex: 10,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none'
        }} />

        {/* Water Level Label */}
        <div style={{
          position: 'absolute',
          top: `${lineY - 10}px`,
          right: '10px',
          fontSize: '9px',
          background: 'var(--color-critical)',
          color: '#FFF',
          padding: '2px 6px',
          borderRadius: '4px',
          fontWeight: 600,
          zIndex: 12,
          pointerEvents: 'none'
        }}>
          DRAG TO WATER LINE ({Math.round(((240 - lineY) / 240) * 100)}%)
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
        <button 
          className="primary-button" 
          style={{ flex: 1, padding: '12px', borderRadius: '12px' }}
          onClick={handleSave}
          disabled={!activeTank}
        >
          {saved ? '✓ Calibration Saved' : 'Confirm Level'}
        </button>
        <button 
          className="secondary-button" 
          style={{ padding: '12px 16px', borderRadius: '12px', backgroundColor: 'transparent', borderColor: '#334155', color: '#94A3B8' }}
          onClick={() => onNavigate('welcome')}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
