import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

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
    <div className="
      fixed inset-0 z-1000 flex items-center justify-center
      bg-[rgba(15,23,42,0.6)] backdrop-blur-xs
    ">
      <form
        onSubmit={handleSubmit}
        className="
          flex w-[380px] flex-col gap-4 rounded-[20px] border
          border-[rgba(13,148,136,0.02)] bg-surface-card p-6
          shadow-[0_20px_25px_-5px_rgba(0,0,0,0.15)]
        "
      >
        <h3 className="m-0 text-base font-bold text-text-main">Add Aquarium Tank</h3>

        <div className="flex gap-0.5 rounded-[10px] bg-border-card p-0.5">
          <button
            type="button"
            onClick={() => { setAddMode('create'); setAddError(''); }}
            className={`
              flex-1 cursor-pointer rounded-lg border-none p-1.5 text-xs
              font-semibold transition-colors
              ${addMode === 'create' ? `bg-surface-card text-text-main` : `
                bg-transparent text-text-muted
              `}
            `}
          >
            Create New Tank
          </button>
          <button
            type="button"
            onClick={() => { setAddMode('link'); setAddError(''); }}
            className={`
              flex-1 cursor-pointer rounded-lg border-none p-1.5 text-xs
              font-semibold transition-colors
              ${addMode === 'link' ? `bg-surface-card text-text-main` : `
                bg-transparent text-text-muted
              `}
            `}
          >
            Link Existing Tank
          </button>
        </div>

        {addError && (
          <div className="
            flex items-center gap-1 text-xs font-medium text-critical
          ">
            <AlertTriangle size={12} className="text-critical" /> {addError}
          </div>
        )}

        {addMode === 'create' ? (
          <div className="flex flex-col gap-3">
            <div>
              <label className="
                mb-1 block text-[11px] font-semibold text-text-muted
              ">AQUARIUM NAME</label>
              <input
                type="text"
                placeholder="e.g. Bedroom Reef"
                value={newTankName}
                onChange={e => setNewTankName(e.target.value)}
                className="
                  w-full rounded-[10px] border border-border-card
                  bg-surface-card px-3 py-2 font-main text-[13px] text-text-main
                  outline-none
                "
                required
              />
            </div>

            <div>
              <label className="
                mb-1.5 block text-[11px] font-semibold text-text-muted
              ">CAMERA SOURCE</label>
              <div className="mb-2 flex gap-4">
                <label className="
                  flex cursor-pointer items-center gap-1.5 text-sm
                  text-text-main
                ">
                  <input
                    type="radio"
                    name="cameraType"
                    checked={cameraType === 'mock'}
                    onChange={() => setCameraType('mock')}
                    className="accent-primary-dark"
                  />
                  Mock Feed
                </label>
                <label className="
                  flex cursor-pointer items-center gap-1.5 text-sm
                  text-text-main
                ">
                  <input
                    type="radio"
                    name="cameraType"
                    checked={cameraType === 'webcam'}
                    onChange={async () => {
                      setCameraType('webcam');
                      await requestCameraAccess();
                    }}
                    className="accent-primary-dark"
                  />
                  Local Webcam
                </label>
              </div>

              {cameraType === 'webcam' && (
                <div>
                  {permissionError ? (
                    <div className="mt-1 text-xs text-critical">
                      {permissionError}
                    </div>
                  ) : (
                    <select
                      value={selectedCamera}
                      onChange={e => setSelectedCamera(e.target.value)}
                      className="
                        w-full rounded-[10px] border border-border-card
                        bg-surface-card px-3 py-2 font-main text-[13px]
                        text-text-main outline-none
                      "
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
            <label className="
              mb-1 block text-[11px] font-semibold text-text-muted
            ">TANK REFERENCE ID / CODE</label>
            <input
              type="text"
              placeholder="e.g. tank-123456"
              value={linkTankCode}
              onChange={e => setLinkTankCode(e.target.value)}
              className="
                w-full rounded-[10px] border border-border-card bg-surface-card
                px-3 py-2 font-main text-[13px] text-text-main outline-none
              "
              required
            />
          </div>
        )}

        <div className="mt-2 flex gap-2.5">
          <button
            type="button"
            className="
              inline-flex flex-1 cursor-pointer items-center justify-center
              gap-2 rounded-[10px] border border-border-card bg-surface-card
              px-5 py-2.5 font-main text-[13px] font-semibold text-text-main
              transition-smooth
              hover:border-text-muted hover:bg-surface-hover
            "
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="
              inline-flex flex-1 cursor-pointer items-center justify-center
              gap-2 rounded-[10px] border-none bg-primary-gradient px-5 py-2.5
              font-main text-[13px] font-semibold text-text-inv
              shadow-[0_4px_12px_rgba(13,148,136,0.15)] transition-smooth
              hover:bg-primary-hover-gradient
              active:scale-[0.98]
            "
          >
            {addMode === 'create' ? 'Create Tank' : 'Link Tank'}
          </button>
        </div>
      </form>
    </div>
  );
};
