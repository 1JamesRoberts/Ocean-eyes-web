// AlertDetail.tsx - Alert detail view extracted from AlertsScreen
import React from 'react';
import { Check, AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { DashboardCard } from './DashboardCard';
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

    <DashboardCard
      padding="loose"
      className={`
        mb-5 border-l-6
        ${alert.severity === 'critical' ? `border-l-critical` : `
          border-l-warning
        `}
      `}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle size={20} className="text-warning" />
        <h2 className="text-xl font-extrabold">{alert.title}</h2>
      </div>
      <p className="mt-1.5 text-xs text-text-muted">{alert.timeAgo}</p>
      <p className="mt-4 text-sm/relaxed text-text-main">
        {alert.message}
      </p>
    </DashboardCard>

    {/* Diagnostic parameters before/after */}
    <div className="mb-5 grid grid-cols-2 gap-4">
      {alert.clarityBefore && (
        <DashboardCard className="text-center">
          <span className="block text-xs text-text-muted">Clarity Shift</span>
          <strong className="mt-1.5 block text-xl">
            {alert.clarityBefore} → {alert.clarityAfter}
          </strong>
        </DashboardCard>
      )}

      {alert.fishBefore && (
        <DashboardCard className="text-center">
          <span className="block text-xs text-text-muted">Fish Discrepancy</span>
          <strong className="mt-1.5 block text-xl">
            {alert.fishBefore} → {alert.fishAfter}
          </strong>
        </DashboardCard>
      )}
    </div>

    {/* Correction tip card */}
    <DashboardCard className="mb-6">
      <h4 className="mb-2 text-sm font-bold text-text-main">Action Plan & Tips</h4>
      <p className="text-[13px] leading-relaxed text-text-muted">
        {alert.tip}
      </p>
    </DashboardCard>

    {!alert.resolved ? (
      <Button
        size="md"
        className="w-full"
        onClick={() => {
          onResolve(alert.id);
          onBack();
        }}
      >
        <Check size={18} /> Mark Alert as Resolved
      </Button>
    ) : (
      <DashboardCard className="bg-good/10 text-center font-semibold text-good">
        ✓ Resolved Alert
      </DashboardCard>
    )}
  </div>
);
