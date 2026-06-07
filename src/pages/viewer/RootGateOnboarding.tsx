import React, { useState } from 'react';
import { useTank } from '../../hooks/useTank';
import { QrCode } from 'lucide-react';

export const RootGateOnboarding: React.FC = () => {
  const { linkTank, createAndLinkTank } = useTank();
  const [qrInput, setQrInput] = useState('');
  const [tankName, setTankName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrInput.trim()) return;
    const success = await linkTank(qrInput.trim());
    if (success) {
      setError('');
    } else {
      setError('Tank ID not found. Verify the ID or create a new one.');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tankName.trim()) return;
    await createAndLinkTank(tankName.trim());
    setTankName('');
  };

  return (
    <div style={{ padding: '60px 24px 24px 24px', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }} className="anim-float-1">
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '24px',
          backgroundColor: 'var(--color-primary-light)',
          color: 'var(--color-primary)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          margin: '0 auto 16px auto',
          boxShadow: '0 8px 24px rgba(13, 148, 136, 0.15)'
        }}>
          <QrCode size={36} />
        </div>
        <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '8px' }}>Link Your Aquarium</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', lineHeight: '145%' }}>
          Scan the QR code displayed on your OceanEyes smart monitoring hardware unit or enter the code manually.
        </p>
      </div>

      {!showCreate ? (
        <form onSubmit={handleLink} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Enter Tank ID (e.g. living-room-tank-77)" 
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              style={{
                width: '100%',
                padding: '16px 20px',
                borderRadius: '16px',
                border: '1px solid var(--color-border)',
                fontFamily: 'var(--font-main)',
                fontSize: '15px',
                outline: 'none',
                transition: 'var(--transition-smooth)',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.01)'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
            />
          </div>

          {error && <p style={{ color: 'var(--color-critical)', fontSize: '13px', textAlign: 'center', fontWeight: 500 }}>{error}</p>}

          <button type="submit" className="primary-button" style={{ width: '100%' }}>
            Link Tank
          </button>

          <div style={{ textAlign: 'center', margin: '16px 0' }}>
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>or</span>
          </div>

          <button 
            type="button" 
            className="secondary-button" 
            style={{ width: '100%', borderRadius: '24px' }}
            onClick={() => {
              // Quick mock link
              linkTank('living-room-tank-77');
            }}
          >
            Link Demo Tank (Living Room Reef)
          </button>

          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            No hardware?{' '}
            <button 
              type="button" 
              style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-main)' }}
              onClick={() => setShowCreate(true)}
            >
              Create virtual tank
            </button>
          </p>
        </form>
      ) : (
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input 
            type="text" 
            placeholder="Virtual Tank Name (e.g. My Bedroom Reef)" 
            value={tankName}
            onChange={(e) => setTankName(e.target.value)}
            style={{
              width: '100%',
              padding: '16px 20px',
              borderRadius: '16px',
              border: '1px solid var(--color-border)',
              fontFamily: 'var(--font-main)',
              fontSize: '15px',
              outline: 'none',
              transition: 'var(--transition-smooth)'
            }}
          />

          <button type="submit" className="primary-button" style={{ width: '100%' }}>
            Create Virtual Tank
          </button>

          <button 
            type="button" 
            className="secondary-button" 
            style={{ width: '100%', borderRadius: '24px' }}
            onClick={() => setShowCreate(false)}
          >
            Back to Linking
          </button>
        </form>
      )}
    </div>
  );
};
