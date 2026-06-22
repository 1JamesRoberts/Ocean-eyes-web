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
      <section className="
        flex flex-col items-center justify-center glass-card border-2
        border-dashed border-white/40 p-6 text-center
      ">
        <div className="
          mb-4 flex size-12 items-center justify-center rounded-full
          bg-secondary/10 text-secondary
        ">
          <span className="material-symbols-outlined text-display">check_circle</span>
        </div>
        <h4 className="text-lg font-bold text-secondary">System Operating Safely</h4>
        <p className="mt-1 text-xs text-on-surface-variant">
          No active safety alarms triggered.
        </p>
      </section>
    );
  }

  return (
    <section className="glass-card p-6">
      <h3 className="
        mb-4 text-xs font-medium tracking-widest text-on-surface-variant/70
        uppercase
      ">
        Active Safety Alerts
      </h3>

      <div className="space-y-3">
        {activeAlerts.map(alert => (
          <button
            key={alert.id}
            type="button"
            className={`
              w-full cursor-pointer rounded-2xl border border-white/20
              bg-white/20 p-4 text-left transition-colors
              hover:bg-white/40
              ${alert.severity === 'critical'
                ? `border-l-4 border-l-critical`
                : `border-l-4 border-l-warning`
              }
            `}
            onClick={() => onSelectAlert(alert.id)}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-primary-dark">{alert.title}</h4>
              <ChevronRight size={16} className="text-on-surface-variant" />
            </div>
            <p className="mt-1 text-xs/relaxed text-on-surface-variant">
              {alert.message}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
});

ActiveAlertsList.displayName = 'ActiveAlertsList';
