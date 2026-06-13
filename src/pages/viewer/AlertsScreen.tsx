import React from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { useAlerts } from '../../hooks/useAlerts';
import { Check, AlertTriangle } from 'lucide-react';

export const AlertsScreen: React.FC = () => {
  const { setActiveTab, selectedAlertId, setSelectedAlertId } = useNavigation();
  const { alerts, resolveAlert } = useAlerts();

  const handleBack = () => {
    setSelectedAlertId(null);
    setActiveTab('home');
  };

  const selectedAlert = alerts.find(a => a.id === selectedAlertId);

  // If an alert is selected, render alert details (representing alert_detail_screen.dart)
  if (selectedAlert) {
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
            ">Alert Details</span>
            <h1 className="mt-0.5 text-[28px] font-extrabold text-text-main">Alert Diagnostics</h1>
          </div>
          <button
            className="
              cursor-pointer border-none bg-transparent font-main text-sm
              font-semibold text-primary-dark
            "
            onClick={() => setSelectedAlertId(null)}
          >
            ← Back
          </button>
        </div>

        <div className="
          mb-5 rounded-[20px] border border-[rgba(13,148,136,0.02)]
          bg-surface-card p-6 shadow-card transition-smooth
        " style={{ borderLeftWidth: '6px', borderLeftColor: selectedAlert.severity === 'critical' ? 'var(--color-critical)' : 'var(--color-warning)' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-warning" />
            <h2 className="text-xl font-extrabold">{selectedAlert.title}</h2>
          </div>
          <p className="mt-1.5 text-xs text-text-muted">{selectedAlert.timeAgo}</p>

          <p className="mt-4 text-sm leading-[150%] text-text-main">
            {selectedAlert.message}
          </p>
        </div>

        {/* Diagnostic parameters before/after */}
        <div className="mb-5 grid grid-cols-2 gap-4">
          {selectedAlert.clarityBefore && (
            <div className="
              rounded-[20px] border border-[rgba(13,148,136,0.02)]
              bg-surface-card p-4 text-center shadow-card transition-smooth
            ">
              <span className="block text-xs text-text-muted">Clarity Shift</span>
              <strong className="mt-1.5 block text-xl">
                {selectedAlert.clarityBefore} → {selectedAlert.clarityAfter}
              </strong>
            </div>
          )}

          {selectedAlert.fishBefore && (
            <div className="
              rounded-[20px] border border-[rgba(13,148,136,0.02)]
              bg-surface-card p-4 text-center shadow-card transition-smooth
            ">
              <span className="block text-xs text-text-muted">Fish Discrepancy</span>
              <strong className="mt-1.5 block text-xl">
                {selectedAlert.fishBefore} → {selectedAlert.fishAfter}
              </strong>
            </div>
          )}
        </div>

        {/* Correction tip card */}
        <div className="
          mb-6 rounded-[20px] border border-[rgba(13,148,136,0.02)]
          bg-surface-card p-5 shadow-card transition-smooth
        ">
          <h4 className="mb-2 text-sm font-bold text-text-main">Action Plan & Tips</h4>
          <p className="text-[13px] leading-[145%] text-text-muted">
            {selectedAlert.tip}
          </p>
        </div>

        {!selectedAlert.resolved ? (
          <button
            className="
              inline-flex w-full cursor-pointer items-center justify-center
              gap-2 rounded-3xl border-none bg-primary-gradient px-6 py-3.5
              font-main text-[15px] font-semibold text-text-inv
              shadow-[0_4px_12px_rgba(13,148,136,0.15)] transition-smooth
              hover:bg-primary-hover-gradient
              active:scale-[0.98]
            "
            onClick={() => {
              resolveAlert(selectedAlert.id);
              setSelectedAlertId(null);
            }}
          >
            <Check size={18} /> Mark Alert as Resolved
          </button>
        ) : (
          <div className="
            rounded-2xl bg-good/10 p-3 text-center font-semibold text-good
          ">
            ✓ Resolved Alert
          </div>
        )}
      </div>
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
          onClick={handleBack}
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
            onClick={() => setSelectedAlertId(alert.id)}
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
