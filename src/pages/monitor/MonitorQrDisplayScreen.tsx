import React, { useState } from 'react';
import { useTank } from '../../hooks/useTank';

interface ScreenProps {
  onNavigate: (screen: 'welcome' | 'qr' | 'calibration' | 'active') => void;
}

export const MonitorQrDisplayScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { tankId, tanks } = useTank();
  const [copied, setCopied] = useState(false);

  const activeTankId = tankId || (tanks.length > 0 ? tanks[0].id : 'living-room-tank-77');

  const copyToClipboard = () => {
    navigator.clipboard.writeText(activeTankId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      padding: '30px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: '#FFFFFF',
      background: '#090D11'
    }}>
      <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', color: '#E2E8F0' }}>Pairing QR Code</h3>
      
      {/* Visual Scannable QR mock */}
      <div className="qr-container" style={{ marginBottom: '20px' }}>
        <div className="qr-code-canvas" />
        <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, marginTop: '12px' }}>
          SCAN ME IN APP
        </span>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <span style={{ fontSize: '11px', color: '#64748B', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Manual Pairing ID</span>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: '#0F172A',
          padding: '10px 16px',
          borderRadius: '10px',
          border: '1px solid #1E293B',
          marginTop: '6px'
        }}>
          <code style={{ fontSize: '13px', color: '#38BDF8' }}>{activeTankId}</code>
          <button 
            onClick={copyToClipboard}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-primary)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      <button 
        className="primary-button" 
        style={{ width: '100%', maxWidth: '240px', padding: '12px', borderRadius: '12px' }}
        onClick={() => onNavigate('welcome')}
      >
        Done pairing
      </button>
    </div>
  );
};
