import React, { useState } from 'react';

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

  if (!show) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (addMode === 'create') {
      if (!newTankName.trim()) return;
      // Mockup: call handler but do not actually create a tank in single-demo-tank mode.
      await onCreateTank(newTankName.trim(), { type: 'webcam' });
      setNewTankName('');
      onClose();
    } else {
      if (!linkTankCode.trim()) return;
      // Mockup: call handler but linking additional tanks is disabled.
      await onLinkTank(linkTankCode.trim());
      setLinkTankCode('');
      onClose();
    }
  };

  const handleClose = () => {
    setNewTankName('');
    setLinkTankCode('');
    setAddMode('create');
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
            onClick={() => { setAddMode('create'); }}
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
            onClick={() => { setAddMode('link'); }}
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
              <div className="
                rounded-[10px] border border-border-card bg-surface-card px-3
                py-2
              ">
                <span className="text-[13px] text-text-main">Local Webcam</span>
              </div>
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
