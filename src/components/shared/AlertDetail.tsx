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
        <span className="block type-caption">Alert Details</span>
        <h1 className="mt-0.5 text-display font-extrabold text-text">Alert Diagnostics</h1>
      </div>
      <button
        className="
          cursor-pointer border-none bg-transparent type-strong text-brand
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
        <h2 className="type-title">{alert.title}</h2>
      </div>
      <p className="mt-1.5 type-caption">{alert.timeAgo}</p>
      <p className="mt-4 type-body">
        {alert.message}
      </p>
    </GlassCard>

    {/* Diagnostic parameters before/after */}
    <div className="mb-5 grid grid-cols-2 gap-4">
      {alert.clarityBefore && (
        <GlassCard className="p-5 text-center">
          <span className="block type-caption">Clarity Shift</span>
          <strong className="mt-1.5 block type-title">
            {alert.clarityBefore} → {alert.clarityAfter}
          </strong>
        </GlassCard>
      )}

      {alert.fishBefore && (
        <GlassCard className="p-5 text-center">
          <span className="block type-caption">Fish Discrepancy</span>
          <strong className="mt-1.5 block type-title">
            {alert.fishBefore} → {alert.fishAfter}
          </strong>
        </GlassCard>
      )}
    </div>

    {/* Correction tip card */}
    <GlassCard className="mb-6 p-5">
      <h4 className="mb-2 type-strong">Action Plan & Tips</h4>
      <p className="type-body-muted">
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
        rounded-2xl bg-good/10 p-3 text-center type-strong text-good
      ">
        ✓ Resolved Alert
      </div>
    )}
  </div>
);
