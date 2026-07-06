// AlertDetail.tsx - Alert detail view extracted from AlertsScreen
import React from 'react';
import { Check, AlertTriangle } from 'lucide-react';
import type { AlertItem } from '../../types/aquarium';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';

interface AlertDetailProps {
  alert: AlertItem;
  onBack: () => void;
  onResolve: (alertId: string) => void;
}

export const AlertDetail: React.FC<AlertDetailProps> = ({ alert, onBack, onResolve }) => (
  <div className="flex flex-col gap-6">
    <div className="
      flex min-h-[75px] items-center justify-between border-b border-border pb-3
      max-xs:flex-col max-xs:items-start max-xs:gap-3
    ">
      <div>
        <span className="block text-xs font-semibold text-text-muted uppercase">Alert Details</span>
        <h1 className="mt-0.5 text-display font-extrabold text-text">Alert Diagnostics</h1>
      </div>
      <button
        className="
          cursor-pointer border-none bg-transparent font-main text-sm
          font-semibold text-brand
        "
        onClick={onBack}
      >
        ← Back
      </button>
    </div>

    <GlassCard
      className="p-5"
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
      <p className="mt-4 text-sm leading-[150%] text-text">
        {alert.message}
      </p>
    </GlassCard>

    {/* Diagnostic parameters before/after */}
    <div className="mb-5 grid grid-cols-2 gap-4">
      {alert.clarityBefore && (
        <GlassCard className="p-5 text-center">
          <span className="block text-xs text-text-muted">Clarity Shift</span>
          <strong className="mt-1.5 block text-xl">
            {alert.clarityBefore} → {alert.clarityAfter}
          </strong>
        </GlassCard>
      )}

      {alert.fishBefore && (
        <GlassCard className="p-5 text-center">
          <span className="block text-xs text-text-muted">Fish Discrepancy</span>
          <strong className="mt-1.5 block text-xl">
            {alert.fishBefore} → {alert.fishAfter}
          </strong>
        </GlassCard>
      )}
    </div>

    {/* Correction tip card */}
    <GlassCard className="mb-6 p-5">
      <h4 className="mb-2 text-sm font-bold text-text">Action Plan & Tips</h4>
      <p className="text-sm leading-[145%] text-text-muted">
        {alert.tip}
      </p>
    </GlassCard>

    {!alert.resolved ? (
      <GlassButton
        variant="primary"
        size="lg"
        fullWidth
        onClick={() => {
          onResolve(alert.id);
          onBack();
        }}
      >
        <Check size={18} /> Mark Alert as Resolved
      </GlassButton>
    ) : (
      <div className="
        rounded-2xl bg-good/10 p-3 text-center font-semibold text-good
      ">
        ✓ Resolved Alert
      </div>
    )}
  </div>
);
