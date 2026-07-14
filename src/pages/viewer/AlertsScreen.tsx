import React from 'react';
import { BellOff, ChevronRight } from 'lucide-react';
import { useAlertsScreen } from '../../hooks/pages/useAlertsScreen';
import { AlertDetail } from '../../components/shared/AlertDetail';
import { BackButton, GlassBadge, GlassPanel, ScreenHeader, ScreenState } from '../../components/shared';

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
    <div className="flex flex-col gap-4">
      <ScreenHeader
        eyebrow="Alerts"
        action={(
          <BackButton onClick={onBack} heroOverlay />
        )}
      />

      <div className="flex flex-col gap-3">
        {alerts.length === 0 ? (
          <div className="glass-card">
            <ScreenState
              icon={BellOff}
              title="No alerts yet"
              description="Aquarium safety events and resolved notices will appear here."
            />
          </div>
        ) : alerts.map(alert => (
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
              <h4 className="type-strong text-text">{alert.title}</h4>
              <ChevronRight size={16} className="text-text-muted" />
            </div>
            <p className="mt-1 type-caption">
              {alert.message}
            </p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="type-caption">{alert.timeAgo}</span>
              {alert.resolved && (
                <GlassBadge color="good">Resolved</GlassBadge>
              )}
            </div>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
};
