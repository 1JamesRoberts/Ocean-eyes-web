import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { AlertItem } from '../../types/aquarium';

interface ActiveAlertsListProps {
  alerts: AlertItem[];
  onSelectAlert: (alertId: string) => void;
}

export const ActiveAlertsList = React.memo<ActiveAlertsListProps>(({ alerts, onSelectAlert }) => {
  const activeAlerts = alerts.filter(a => !a.resolved);

  if (activeAlerts.length === 0) {
    return (
      <div className="
        rounded-[20px] border border-dashed border-border-card bg-surface-card
        px-4 py-8 text-center shadow-card
      ">
        <span className="mb-2 block text-2xl">✓</span>
        <strong className="text-sm text-good">System Operating Safely</strong>
        <p className="mt-1 text-xs text-text-muted">No active safety alarms triggered.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="mb-3 text-base font-bold text-text-main">
        Active Safety Alerts
      </h3>

      {activeAlerts.map(alert => (
        <button
          key={alert.id}
          type="button"
          className={`
            w-full cursor-pointer rounded-[20px] border border-l-4
            border-[rgba(13,148,136,0.02)] bg-surface-card p-4 text-left
            shadow-card transition-smooth
            hover:-translate-y-px hover:border-[rgba(13,148,136,0.12)]
            hover:shadow-[0_8px_24px_rgba(13,148,136,0.08)]
            ${alert.severity === 'critical'
              ? `
                border-l-critical
                hover:border-l-critical
              `
              : `
                border-l-warning
                hover:border-l-warning
              `
            }
          `}
          onClick={() => onSelectAlert(alert.id)}
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-text-main">{alert.title}</h4>
            <ChevronRight size={16} className="text-text-muted" />
          </div>
          <p className="mt-1 text-xs leading-[135%] text-text-muted">
            {alert.message}
          </p>
        </button>
      ))}
    </div>
  );
});

ActiveAlertsList.displayName = 'ActiveAlertsList';
