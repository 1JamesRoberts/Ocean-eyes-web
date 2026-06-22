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
    <div className="flex h-full flex-col justify-center px-6 pt-15 pb-6">
      <div className="mb-10 animate-float-1 text-center">
        <div className="
          mx-auto mb-4 flex size-[72px] items-center justify-center rounded-3xl
          bg-primary-light-gradient text-primary-dark
          shadow-[0_8px_24px_rgba(13,148,136,0.15)]
        ">
          <QrCode size={36} />
        </div>
        <h2 className="mb-2 text-section font-extrabold text-text-main">Link Your Aquarium</h2>
        <p className="text-sm leading-[145%] text-text-muted">
          Scan the QR code displayed on your OceanEyes smart monitoring hardware unit or enter the code manually.
        </p>
      </div>

      {!showCreate ? (
        <form onSubmit={handleLink} className="flex flex-col gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Enter Tank ID"
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              className="
                w-full rounded-2xl border border-border-card bg-surface-card
                px-5 py-4 font-main text-h3 text-text-main
                shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)] outline-none
                transition-smooth
                focus:border-primary-dark
              "
            />
          </div>

          {error && <p className="text-center text-sm font-medium text-critical">{error}</p>}

          <button type="submit" className="
            inline-flex w-full cursor-pointer items-center justify-center gap-2
            rounded-3xl border-none bg-primary-gradient px-6 py-3 font-main
            text-h3 font-semibold text-text-inv shadow-primary-hover
            transition-smooth
            hover:bg-primary-hover-gradient
            active:scale-[0.98]
          ">
            Link Tank
          </button>

          <p className="mt-6 text-center text-sm text-text-muted">
            No hardware?{' '}
            <button
              type="button"
              className="
                cursor-pointer border-none bg-transparent font-main
                font-semibold text-primary-dark
              "
              onClick={() => setShowCreate(true)}
            >
              Create virtual tank
            </button>
          </p>
        </form>
      ) : (
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Virtual Tank Name (e.g. My Bedroom Reef)"
            value={tankName}
            onChange={(e) => setTankName(e.target.value)}
            className="
              w-full rounded-2xl border border-border-card bg-surface-card px-5
              py-4 font-main text-h3 text-text-main outline-none
              transition-smooth
              focus:border-primary-dark
            "
          />

          <button type="submit" className="
            inline-flex w-full cursor-pointer items-center justify-center gap-2
            rounded-3xl border-none bg-primary-gradient px-6 py-3 font-main
            text-h3 font-semibold text-text-inv shadow-primary-hover
            transition-smooth
            hover:bg-primary-hover-gradient
            active:scale-[0.98]
          ">
            Create Virtual Tank
          </button>

          <button
            type="button"
            className="
              inline-flex w-full cursor-pointer items-center justify-center
              gap-2 rounded-3xl border border-border-card bg-surface-card px-5
              py-3 font-main text-sm font-semibold text-text-main
              transition-smooth
              hover:border-text-muted hover:bg-surface-hover
            "
            onClick={() => setShowCreate(false)}
          >
            Back to Linking
          </button>
        </form>
      )}
    </div>
  );
};
