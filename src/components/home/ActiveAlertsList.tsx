import React from 'react';
import { ChevronRight, ShieldAlert, ShieldCheck } from 'lucide-react';
import { CardSectionHeader, ScreenState } from '../shared';
import type { AlertItem } from '../../types/aquarium';

interface ActiveAlertsListProps {
  alerts: AlertItem[];
  onSelectAlert: (alertId: string) => void;
}

export const ActiveAlertsList = React.memo<ActiveAlertsListProps>(({ alerts, onSelectAlert }) => {
  const activeAlerts = alerts.filter(a => !a.resolved);

  if (activeAlerts.length === 0) {
    return (
      <section className="glass-card border-2 border-dashed border-white/40">
        <ScreenState
          icon={ShieldCheck}
          title="System operating safely"
          description="No active safety alarms require your attention."
          tone="success"
          compact
        />
      </section>
    );
  }

  return (
    <section className="glass-card p-5 pb-4">
      <CardSectionHeader
        icon={ShieldAlert}
        title="Alerts"
        detail="Needs your attention"
      />

      <div className="space-y-3 border-t border-text-muted/15 pt-3">
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
              <h4 className="type-strong text-text">{alert.title}</h4>
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
