import React from 'react';
import { useAlertsScreen } from '../../hooks/pages/useAlertsScreen';
import { AlertDetail } from '../../components/shared/AlertDetail';
import { GlassCard } from '../../components/shared';

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
            font-semibold text-primary-dark
          "
          onClick={onBack}
        >
          ← Back
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {alerts.map(alert => (
          <GlassCard
            key={alert.id}
            className={`
              cursor-pointer p-4 transition-smooth
              hover:-translate-y-px hover:border-[rgba(13,148,136,0.12)]
              hover:shadow-[0_8px_24px_rgba(13,148,136,0.08)]
              ${alert.resolved ? `opacity-60` : ''}
            `}
            style={{ borderLeftWidth: '5px', borderLeftColor: alert.resolved ? 'var(--color-good)' : alert.severity === 'critical' ? 'var(--color-critical)' : 'var(--color-warning)' }}
            onClick={() => onSelectAlert(alert.id)}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-text">{alert.title}</h4>
              <span className="text-caption text-text-muted">{alert.timeAgo}</span>
            </div>
            <p className="mt-1 truncate text-xs text-text-muted">
              {alert.message}
            </p>
            {alert.resolved && (
              <span className="mt-2 block text-2xs font-semibold text-good">
                ✓ RESOLVED
              </span>
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  );
};
