import React, { useState } from 'react';
import { GlassModal } from '../shared/GlassModal';
import { GlassButton } from '../shared/GlassButton';
import { GlassInput } from '../shared/GlassInput';

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
      await onCreateTank(newTankName.trim(), { type: 'webcam' });
      setNewTankName('');
      onClose();
    } else {
      if (!linkTankCode.trim()) return;
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
    <GlassModal isOpen={show} onClose={handleClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <h3 className="m-0 text-base font-bold text-primary-dark">Add Aquarium Tank</h3>

        <div className="
          flex gap-0.5 rounded-[10px] border border-white/20 bg-white/20 p-0.5
        ">
          <button
            type="button"
            onClick={() => { setAddMode('create'); }}
            className={`
              flex-1 cursor-pointer rounded-lg border-none p-1.5 text-xs
              font-semibold transition-colors
              ${addMode === 'create'
                ? 'bg-white/50 text-primary-dark'
                : 'bg-transparent text-on-surface-variant'
              }
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
              ${addMode === 'link'
                ? 'bg-white/50 text-primary-dark'
                : 'bg-transparent text-on-surface-variant'
              }
            `}
          >
            Link Existing Tank
          </button>
        </div>

        {addMode === 'create' ? (
          <div className="flex flex-col gap-3">
            <GlassInput
              id="tank-name"
              label="AQUARIUM NAME"
              type="text"
              placeholder="e.g. Bedroom Reef"
              value={newTankName}
              onChange={e => setNewTankName(e.target.value)}
              required
            />

            <div>
              <label className="
                mb-1.5 block text-caption font-semibold text-on-surface-variant
              ">
                CAMERA SOURCE
              </label>
              <div className="glass-input">
                <span className="text-sm">Local Webcam</span>
              </div>
            </div>
          </div>
        ) : (
          <GlassInput
            id="tank-code"
            label="TANK REFERENCE ID / CODE"
            type="text"
            placeholder="e.g. tank-123456"
            value={linkTankCode}
            onChange={e => setLinkTankCode(e.target.value)}
            required
          />
        )}

        <div className="mt-2 flex gap-2.5">
          <GlassButton
            variant="outline"
            size="md"
            fullWidth
            onClick={handleClose}
            type="button"
          >
            Cancel
          </GlassButton>
          <GlassButton
            variant="primary"
            size="md"
            fullWidth
            type="submit"
          >
            {addMode === 'create' ? 'Create Tank' : 'Link Tank'}
          </GlassButton>
        </div>
      </form>
    </GlassModal>
  );
};
