import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useAlertsScreen } from '../../hooks/pages/useAlertsScreen';
import { AlertDetail } from '../../components/shared/AlertDetail';
import { GlassPanel } from '../../components/shared';

export const AlertsScreen: React.FC = () => {
  const {
    alerts,
    selectedAlert,
    onBack,
    onSelectAlert,
    onCloseDetail,
    onResolve,
  } = useAlertsScreen();

  // If an alert is selected, render the extracted AlertDetail component
  if (selectedAlert) {
    return (
      <AlertDetail
        alert={selectedAlert}
        onBack={onCloseDetail}
        onResolve={onResolve}
      />
    );
  }

  // Alerts Log List
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
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

      <div className="flex flex-col gap-3">
        {alerts.map(alert => (
          <GlassPanel
            as="button"
            type="button"
            key={alert.id}
            className={`
              p-4
              ${alert.resolved ? `opacity-60` : ''}
              ${alert.resolved ? 'border-l-4 border-l-good' : alert.severity === 'critical' ? 'border-l-4 border-l-critical' : 'border-l-4 border-l-warning'}
            `}
            onClick={() => onSelectAlert(alert.id)}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-brand">{alert.title}</h4>
              <ChevronRight size={16} className="text-text-muted" />
            </div>
            <p className="mt-1 text-xs/relaxed text-text-muted">
              {alert.message}
            </p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-caption text-text-muted">{alert.timeAgo}</span>
              {alert.resolved && (
                <span className="rounded-full bg-good/12 px-2.5 py-1 text-2xs font-bold text-good">
                  Resolved
                </span>
              )}
            </div>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
};
