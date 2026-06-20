import React from 'react';
import { useAlertsScreen } from '../../hooks/pages/useAlertsScreen';
import { AlertDetail } from '../../components/shared/AlertDetail';

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
      <div className="
        flex min-h-[75px] items-center justify-between border-b
        border-border-card pb-3
        max-xs:flex-col max-xs:items-start max-xs:gap-3
      ">
        <div>
          <span className="
            block text-xs font-semibold text-text-muted uppercase
          ">Notifications</span>
          <h1 className="mt-0.5 text-[28px] font-extrabold text-text-main">Safety Alerts</h1>
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

      <div className="flex flex-col gap-3">
        {alerts.map(alert => (
          <div
            key={alert.id}
            className={`
              cursor-pointer rounded-[20px] border
              border-[rgba(13,148,136,0.02)] bg-surface-card p-4 shadow-card
              transition-smooth
              hover:-translate-y-px hover:border-[rgba(13,148,136,0.12)]
              hover:shadow-[0_8px_24px_rgba(13,148,136,0.08)]
              ${alert.resolved ? `opacity-60` : ''}
            `}
            style={{ borderLeftWidth: '5px', borderLeftColor: alert.resolved ? 'var(--color-good)' : alert.severity === 'critical' ? 'var(--color-critical)' : 'var(--color-warning)' }}
            onClick={() => onSelectAlert(alert.id)}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-text-main">{alert.title}</h4>
              <span className="text-[11px] text-text-muted">{alert.timeAgo}</span>
            </div>
            <p className="mt-1 truncate text-xs text-text-muted">
              {alert.message}
            </p>
            {alert.resolved && (
              <span className="mt-2 block text-[10px] font-semibold text-good">
                ✓ RESOLVED
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
