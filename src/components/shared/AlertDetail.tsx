// AlertDetail.tsx - Alert detail view extracted from AlertsScreen
import React from 'react';
import { Check, AlertTriangle } from 'lucide-react';
import type { AlertItem } from '../../types/aquarium';

interface AlertDetailProps {
  alert: AlertItem;
  onBack: () => void;
  onResolve: (alertId: string) => void;
}

export const AlertDetail: React.FC<AlertDetailProps> = ({ alert, onBack, onResolve }) => (
  <div className="flex flex-col gap-6">
    <div className="
      flex min-h-[75px] items-center justify-between border-b border-border-card
      pb-3
      max-xs:flex-col max-xs:items-start max-xs:gap-3
    ">
      <div>
        <span className="block text-xs font-semibold text-text-muted uppercase">Alert Details</span>
        <h1 className="mt-0.5 text-[28px] font-extrabold text-text-main">Alert Diagnostics</h1>
      </div>
      <button
        className="
          cursor-pointer border-none bg-transparent font-main text-sm
          font-semibold text-primary-dark
        "
        onClick={onBack}
      >
        ← Back
      </button>
    </div>

    <div
      className="
        mb-5 rounded-[20px] border border-[rgba(13,148,136,0.02)]
        bg-surface-card p-6 shadow-card transition-smooth
      "
      style={{
        borderLeftWidth: '6px',
        borderLeftColor: alert.severity === 'critical' ? 'var(--color-critical)' : 'var(--color-warning)',
      }}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle size={20} className="text-warning" />
        <h2 className="text-xl font-extrabold">{alert.title}</h2>
      </div>
      <p className="mt-1.5 text-xs text-text-muted">{alert.timeAgo}</p>
      <p className="mt-4 text-sm leading-[150%] text-text-main">
        {alert.message}
      </p>
    </div>

    {/* Diagnostic parameters before/after */}
    <div className="mb-5 grid grid-cols-2 gap-4">
      {alert.clarityBefore && (
        <div className="
          rounded-[20px] border border-[rgba(13,148,136,0.02)] bg-surface-card
          p-4 text-center shadow-card transition-smooth
        ">
          <span className="block text-xs text-text-muted">Clarity Shift</span>
          <strong className="mt-1.5 block text-xl">
            {alert.clarityBefore} → {alert.clarityAfter}
          </strong>
        </div>
      )}

      {alert.fishBefore && (
        <div className="
          rounded-[20px] border border-[rgba(13,148,136,0.02)] bg-surface-card
          p-4 text-center shadow-card transition-smooth
        ">
          <span className="block text-xs text-text-muted">Fish Discrepancy</span>
          <strong className="mt-1.5 block text-xl">
            {alert.fishBefore} → {alert.fishAfter}
          </strong>
        </div>
      )}
    </div>

    {/* Correction tip card */}
    <div className="
      mb-6 rounded-[20px] border border-[rgba(13,148,136,0.02)] bg-surface-card
      p-5 shadow-card transition-smooth
    ">
      <h4 className="mb-2 text-sm font-bold text-text-main">Action Plan & Tips</h4>
      <p className="text-[13px] leading-[145%] text-text-muted">
        {alert.tip}
      </p>
    </div>

    {!alert.resolved ? (
      <button
        className="
          inline-flex w-full cursor-pointer items-center justify-center gap-2
          rounded-3xl border-none bg-primary-gradient px-6 py-3.5 font-main
          text-[15px] font-semibold text-text-inv
          shadow-[0_4px_12px_rgba(13,148,136,0.15)] transition-smooth
          hover:bg-primary-hover-gradient
          active:scale-[0.98]
        "
        onClick={() => {
          onResolve(alert.id);
          onBack();
        }}
      >
        <Check size={18} /> Mark Alert as Resolved
      </button>
    ) : (
      <div className="
        rounded-2xl bg-good/10 p-3 text-center font-semibold text-good
      ">
        ✓ Resolved Alert
      </div>
    )}
  </div>
);
