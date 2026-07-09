import React from 'react';
import { ChevronRight, ShieldAlert } from 'lucide-react';
import type { AlertItem } from '../../types/aquarium';

interface ActiveAlertsListProps {
  alerts: AlertItem[];
  onSelectAlert: (alertId: string) => void;
}

export const ActiveAlertsList = React.memo<ActiveAlertsListProps>(({ alerts, onSelectAlert }) => {
  const activeAlerts = alerts.filter(a => !a.resolved);

  if (activeAlerts.length === 0) {
    return (
      <section className="
        flex flex-col items-center justify-center glass-card border-2
        border-dashed border-white/40 p-6 text-center
      ">
        <div className="
          mb-4 flex size-12 items-center justify-center rounded-full
          bg-brand-bright/10 text-brand-bright
        ">
          <span className="material-symbols-outlined text-display">check_circle</span>
        </div>
        <h4 className="type-title text-brand-bright">System Operating Safely</h4>
        <p className="mt-1 type-caption">
          No active safety alarms triggered.
        </p>
      </section>
    );
  }

  return (
    <section className="glass-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <ShieldAlert size={16} strokeWidth={2.5} className="text-brand" />
        <h3 className="type-title">
          Active Safety Alerts
        </h3>
      </div>

      <div className="space-y-3">
        {activeAlerts.map(alert => (
          <button
            key={alert.id}
            type="button"
            className={`
              w-full cursor-pointer rounded-2xl border border-white/20
              bg-white/20 p-4 text-left transition-colors
              hover:bg-white/60
              ${alert.severity === 'critical'
                ? `border-l-4 border-l-critical`
                : `border-l-4 border-l-warning`
              }
            `}
            onClick={() => onSelectAlert(alert.id)}
          >
            <div className="flex items-center justify-between">
              <h4 className="type-strong text-brand">{alert.title}</h4>
              <ChevronRight size={16} className="text-text-muted" />
            </div>
            <p className="mt-1 type-caption">
              {alert.message}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
});

ActiveAlertsList.displayName = 'ActiveAlertsList';
