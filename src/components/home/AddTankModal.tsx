import React, { useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface AddTankModalProps {
  show: boolean;
  onClose: () => void;
  onCreateTank: (name: string, cameraSource?: { type: 'mock' | 'webcam'; deviceId?: string }) => Promise<void>;
  onLinkTank: (tankId: string) => Promise<boolean>;
}

export const AddTankModal: React.FC<AddTankModalProps> = ({
  show,
  onClose,
  onCreateTank,
  onLinkTank
}) => {
  const [addMode, setAddMode] = useState<'create' | 'link'>('create');
  const [newTankName, setNewTankName] = useState('');
  const [linkTankCode, setLinkTankCode] = useState('');
  const [addError, setAddError] = useState('');

  const [cameraType, setCameraType] = useState<'mock' | 'webcam'>('mock');
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [permissionError, setPermissionError] = useState('');

  const requestCameraAccess = async () => {
    try {
      setPermissionError('');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      setCameras(videoDevices);
      if (videoDevices.length > 0) {
        setSelectedCamera(videoDevices[0].deviceId);
      }
    } catch {
      setPermissionError('Camera access denied or unavailable.');
    }
  };

  if (!show) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    if (addMode === 'create') {
      if (!newTankName.trim()) return;
      try {
        await onCreateTank(newTankName.trim(), {
          type: cameraType,
          deviceId: cameraType === 'webcam' ? selectedCamera : undefined
        });
        setNewTankName('');
        onClose();
      } catch {
        setAddError('Failed to create tank.');
      }
    } else {
      if (!linkTankCode.trim()) return;
      const success = await onLinkTank(linkTankCode.trim());
      if (success) {
        setLinkTankCode('');
        onClose();
      } else {
        setAddError('Invalid reference code or tank already linked.');
      }
    }
  };

  const handleClose = () => {
    setNewTankName('');
    setLinkTankCode('');
    setAddError('');
    setAddMode('create');
    setCameraType('mock');
    setCameras([]);
    setSelectedCamera('');
    setPermissionError('');
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <form
        onSubmit={handleSubmit}
        className="card-decoration"
        style={{
          padding: '24px',
          width: '380px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)'
        }}
      >
        <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>Add Aquarium Tank</h3>

        <div style={{ display: 'flex', background: 'var(--color-border)', padding: '2px', borderRadius: '10px', gap: '2px' }}>
          <button
            type="button"
            onClick={() => { setAddMode('create'); setAddError(''); }}
            style={{
              flex: 1,
              padding: '6px',
              fontSize: '12px',
              border: 'none',
              borderRadius: '8px',
              background: addMode === 'create' ? 'var(--color-surface)' : 'transparent',
              color: addMode === 'create' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Create New Tank
          </button>
          <button
            type="button"
            onClick={() => { setAddMode('link'); setAddError(''); }}
            style={{
              flex: 1,
              padding: '6px',
              fontSize: '12px',
              border: 'none',
              borderRadius: '8px',
              background: addMode === 'link' ? 'var(--color-surface)' : 'transparent',
              color: addMode === 'link' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Link Existing Tank
          </button>
        </div>

        {addError && (
          <div style={{ color: 'var(--color-critical)', fontSize: '12px', fontWeight: 500 }}>
            <AlertTriangle size={12} color="var(--color-critical)" /> {addError}
          </div>
        )}

        {addMode === 'create' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px', fontWeight: 600 }}>AQUARIUM NAME</label>
              <input
                type="text"
                placeholder="e.g. Bedroom Reef"
                value={newTankName}
                onChange={e => setNewTankName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-border)',
                  outline: 'none',
                  fontFamily: 'var(--font-main)',
                  fontSize: '13px',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-primary)'
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '6px', fontWeight: 600 }}>CAMERA SOURCE</label>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--color-text-primary)' }}>
                  <input
                    type="radio"
                    name="cameraType"
                    checked={cameraType === 'mock'}
                    onChange={() => setCameraType('mock')}
                    style={{ accentColor: 'var(--color-primary)' }}
                  />
                  Mock Feed
                </label>
                <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--color-text-primary)' }}>
                  <input
                    type="radio"
                    name="cameraType"
                    checked={cameraType === 'webcam'}
                    onChange={async () => {
                      setCameraType('webcam');
                      await requestCameraAccess();
                    }}
                    style={{ accentColor: 'var(--color-primary)' }}
                  />
                  Local Webcam
                </label>
              </div>

              {cameraType === 'webcam' && (
                <div>
                  {permissionError ? (
                    <div style={{ color: 'var(--color-critical)', fontSize: '12px', marginTop: '4px' }}>
                      {permissionError}
                    </div>
                  ) : (
                    <select
                      value={selectedCamera}
                      onChange={e => setSelectedCamera(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '10px',
                        border: '1px solid var(--color-border)',
                        outline: 'none',
                        fontFamily: 'var(--font-main)',
                        fontSize: '13px',
                        backgroundColor: 'var(--color-surface)',
                        color: 'var(--color-text-primary)'
                      }}
                    >
                      {cameras.length === 0 ? (
                        <option value="">Searching for cameras...</option>
                      ) : (
                        cameras.map(cam => (
                          <option key={cam.deviceId} value={cam.deviceId}>
                            {cam.label || `Webcam ${cam.deviceId.slice(0, 5)}`}
                          </option>
                        ))
                      )}
                    </select>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px', fontWeight: 600 }}>TANK REFERENCE ID / CODE</label>
            <input
              type="text"
              placeholder="e.g. tank-123456"
              value={linkTankCode}
              onChange={e => setLinkTankCode(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid var(--color-border)',
                outline: 'none',
                fontFamily: 'var(--font-main)',
                fontSize: '13px',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-primary)'
              }}
              required
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button
            type="button"
            className="secondary-button"
            style={{ flex: 1, padding: '10px', fontSize: '13px', borderRadius: '10px' }}
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="primary-button"
            style={{ flex: 1, padding: '10px', fontSize: '13px', borderRadius: '10px' }}
          >
            {addMode === 'create' ? 'Create Tank' : 'Link Tank'}
          </button>
        </div>
      </form>
    </div>
  );
};
