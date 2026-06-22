import React, { useState } from 'react';
import { Button } from '../shared/Button';
import { Modal } from '../shared/Modal';

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
    <Modal
      isOpen={show}
      onClose={handleClose}
      title="Add Aquarium Tank"
      className="w-[380px]"
      footer={
        <>
          <Button variant="secondary" size="md" className="
            flex-1 rounded-[10px]
          " onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" size="md" className="flex-1 rounded-[10px]" form="add-tank-form">
            {addMode === 'create' ? 'Create Tank' : 'Link Tank'}
          </Button>
        </>
      }
    >
      <form
        id="add-tank-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
      >
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

      </form>
    </Modal>
  );
};
