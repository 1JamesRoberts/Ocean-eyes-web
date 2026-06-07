import React from 'react';
import { useTank } from '../../hooks/useTank';
import { Camera } from 'lucide-react';

interface ScreenProps {
  onNavigate: (screen: 'welcome' | 'qr' | 'calibration' | 'active') => void;
}

export const MonitorWelcomeScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { tankId, activeTank: contextActiveTank, tanks } = useTank();
  const activeTank = contextActiveTank || (tanks.length > 0 ? tanks[0] : null);

  return (
    <div style={{
      padding: '40px 24px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%',
      color: '#FFFFFF',
      textAlign: 'center',
      background: 'radial-gradient(circle at center, #0F172A 0%, #020617 100%)'
    }}>
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #115E59 0%, #0F766E 100%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: '24px',
        border: '3px solid #0D9488',
        boxShadow: '0 0 20px rgba(13, 148, 136, 0.4)'
      }} className="anim-float-1">
        <Camera size={36} style={{ color: '#2DD4BF' }} />
      </div>

      <h2 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '8px', color: '#F1F5F9' }}>Smart Tank Unit</h2>
      <p style={{ fontSize: '13px', color: '#94A3B8', maxWidth: '320px', lineHeight: '145%', marginBottom: '32px' }}>
        Position the camera unit against the aquarium glass, complete calibration, and pair with your mobile app.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', maxWidth: '280px' }}>
        <button 
          className="primary-button" 
          style={{ width: '100%', padding: '14px', borderRadius: '12px' }}
          onClick={() => onNavigate('active')}
        >
          {tankId ? 'Open Live Camera Monitor' : 'Open Live Camera Monitor (Demo Mode)'}
        </button>

        {!tankId && (
          <button 
            className="primary-button" 
            style={{ width: '100%', padding: '14px', borderRadius: '12px', backgroundColor: '#1E293B', color: '#E2E8F0', border: '1px solid #334155' }}
            onClick={() => onNavigate('qr')}
          >
            Pair with Mobile App
          </button>
        )}

        <button 
          className="secondary-button" 
          style={{ width: '100%', padding: '12px', borderRadius: '12px', backgroundColor: 'transparent', borderColor: '#334155', color: '#E2E8F0' }}
          onClick={() => onNavigate('calibration')}
        >
          Calibrate Water Level
        </button>
      </div>

      {activeTank && (
        <div style={{ marginTop: '40px', fontSize: '12px', color: '#64748B' }}>
          Linked Tank: <strong>{activeTank.name}</strong> {!tankId && <span style={{ color: 'var(--color-warning)', marginLeft: '4px' }}>(Unpaired Demo)</span>}
        </div>
      )}
    </div>
  );
};
