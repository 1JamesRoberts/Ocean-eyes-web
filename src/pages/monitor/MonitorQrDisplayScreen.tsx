import React, { useState } from 'react';
import { useTank } from '../../hooks/useTank';

interface ScreenProps {
  onNavigate: (screen: 'welcome' | 'qr' | 'calibration' | 'active') => void;
}

export const MonitorQrDisplayScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { tankId, tanks } = useTank();
  const [isCopied, setIsCopied] = useState(false);

  const activeTankId = tankId || (tanks.length > 0 ? tanks[0].id : '');

  const copyToClipboard = () => {
    navigator.clipboard.writeText(activeTankId);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="
      flex h-full flex-col items-center justify-center bg-[#090D11] px-6
      py-[30px] text-white
    ">
      <h3 className="mb-5 type-title-inverse">Pairing QR Code</h3>

      {activeTankId ? (
        <>
          {/* Visual Scannable QR mock */}
          <div className="
            mb-5 flex flex-col items-center rounded-[20px] border border-border
            bg-surface p-6
          ">
            <div className="qr-code-canvas" />
            <span className="mt-3 type-caption">
              SCAN ME IN APP
            </span>
          </div>

          <div className="mb-6 text-center">
            <span className="
              block type-caption-inverse
            ">Manual Pairing ID</span>
            <div className="
              mt-1.5 flex items-center gap-2.5 rounded-[10px] border
              border-[#1E293B] bg-[#0F172A] px-4 py-2.5
            ">
              <code className="type-caption text-[#38BDF8]">{activeTankId}</code>
              <button
                onClick={copyToClipboard}
                className="
                  cursor-pointer border-none bg-transparent type-caption text-brand underline
                "
              >
                {isCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </>
      ) : (
        <p className="mb-6 text-center type-body-muted-inverse">
          No tank configured. Create a tank first to generate a pairing code.
        </p>
      )}

      <button
        className="
          inline-flex w-full max-w-[240px] cursor-pointer items-center
          justify-center gap-2 rounded-xl border-none bg-primary-gradient px-6
          py-3 type-strong-inverse
          shadow-[0_4px_12px_rgba(13,148,136,0.15)] transition-smooth
          hover:bg-primary-hover-gradient
          active:scale-[0.98]
        "
        onClick={() => onNavigate('welcome')}
      >
        Done pairing
      </button>
    </div>
  );
};
