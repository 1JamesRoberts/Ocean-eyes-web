import React, { useState } from 'react';
import { useTank } from '../../hooks/useTank';
import { QrCode } from 'lucide-react';
import { GlassCard, GlassButton, GlassInput } from '../../components/shared';

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
      <div className="mb-10 text-center">
        <div className="
          mx-auto mb-4 flex size-[72px] items-center justify-center rounded-3xl
          border border-white/20 bg-primary-soft-gradient text-brand
          shadow-[0_8px_24px_rgba(13,148,136,0.15)]
        ">
          <QrCode size={36} />
        </div>
        <h2 className="mb-2 text-section font-extrabold text-text">Link Your Aquarium</h2>
        <p className="type-body-muted">
          Scan the QR code displayed on your OceanEyes smart monitoring hardware unit or enter the code manually.
        </p>
      </div>

      {!showCreate ? (
        <GlassCard className="p-6">
          <form onSubmit={handleLink} className="flex flex-col gap-4">
          <div className="relative">
            <GlassInput id="tank-id" placeholder="Enter Tank ID" value={qrInput} onChange={(e) => setQrInput(e.target.value)} />
          </div>

          {error && <p className="text-center type-body text-critical">{error}</p>}

          <GlassButton variant="primary" size="lg" fullWidth type="submit">Link Tank</GlassButton>

          <p className="mt-6 text-center type-body-muted">
            No hardware?{' '}
            <button
              type="button"
              className="
                cursor-pointer border-none bg-transparent font-main
                type-strong text-brand
              "
              onClick={() => setShowCreate(true)}
            >
              Create virtual tank
            </button>
          </p>
        </form>
        </GlassCard>
      ) : (
        <GlassCard className="p-6">
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <GlassInput id="tank-name" placeholder="Virtual Tank Name (e.g. My Bedroom Reef)" value={tankName} onChange={(e) => setTankName(e.target.value)} />

          <GlassButton variant="primary" size="lg" fullWidth type="submit">Create Virtual Tank</GlassButton>

          <GlassButton variant="outline" size="lg" fullWidth type="button" onClick={() => setShowCreate(false)}>Back to Linking</GlassButton>
        </form>
        </GlassCard>
      )}
    </div>
  );
};
