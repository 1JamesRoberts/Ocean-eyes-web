import React from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { DashboardCard } from '../shared/DashboardCard';
import { EmptyState } from '../shared/EmptyState';
import type { AlertItem } from '../../types/aquarium';

interface ActiveAlertsListProps {
  alerts: AlertItem[];
  onSelectAlert: (alertId: string) => void;
}

export const ActiveAlertsList = React.memo<ActiveAlertsListProps>(({ alerts, onSelectAlert }) => {
  const activeAlerts = alerts.filter(a => !a.resolved);

  if (activeAlerts.length === 0) {
    return (
      <EmptyState
        icon={Check}
        message="System Operating Safely"
        hint="No active safety alarms triggered."
        size="sm"
        className="
          rounded-card border border-dashed border-border-card bg-surface-card
          shadow-card
        "
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="mb-3 text-base font-bold text-text-main">
        Active Safety Alerts
      </h3>

      {activeAlerts.map(alert => (
        <DashboardCard
          key={alert.id}
          variant="hoverable"
          padding="compact"
          className={`
            w-full cursor-pointer border-l-4 text-left
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
          <p className="mt-1 text-xs/relaxed text-text-muted">
            {alert.message}
          </p>
        </DashboardCard>
      ))}
    </div>
  );
});

ActiveAlertsList.displayName = 'ActiveAlertsList';
