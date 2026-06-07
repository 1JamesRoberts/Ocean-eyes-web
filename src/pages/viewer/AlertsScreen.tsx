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
      <div style={{ padding: '0 20px 30px 20px' }}>
        <div className="canvas-header" style={{ marginBottom: '24px' }}>
          <button 
            style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-main)' }}
            onClick={() => setSelectedAlertId(null)}
          >
            ← Back
          </button>
          <h1 className="canvas-title" style={{ fontSize: '20px' }}>Alert Diagnostics</h1>
          <div style={{ width: '40px' }} />
        </div>

        <div className="card-decoration" style={{ padding: '24px', marginBottom: '20px', borderLeft: `6px solid ${selectedAlert.severity === 'critical' ? 'var(--color-critical)' : 'var(--color-warning)'}` }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <AlertTriangle size={20} color="var(--color-warning)" />
            <h2 style={{ fontSize: '20px', fontWeight: 800 }}>{selectedAlert.title}</h2>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '6px' }}>{selectedAlert.timeAgo}</p>
          
          <p style={{ fontSize: '14px', color: 'var(--color-text-primary)', marginTop: '16px', lineHeight: '150%' }}>
            {selectedAlert.message}
          </p>
        </div>

        {/* Diagnostic parameters before/after */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          {selectedAlert.clarityBefore && (
            <div className="card-decoration" style={{ padding: '16px', textAlign: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>Clarity Shift</span>
              <strong style={{ fontSize: '20px', display: 'block', marginTop: '6px' }}>
                {selectedAlert.clarityBefore} → {selectedAlert.clarityAfter}
              </strong>
            </div>
          )}

          {selectedAlert.fishBefore && (
            <div className="card-decoration" style={{ padding: '16px', textAlign: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>Fish Discrepancy</span>
              <strong style={{ fontSize: '20px', display: 'block', marginTop: '6px' }}>
                {selectedAlert.fishBefore} → {selectedAlert.fishAfter}
              </strong>
            </div>
          )}
        </div>

        {/* Correction tip card */}
        <div className="card-decoration" style={{ padding: '20px', marginBottom: '24px', backgroundColor: '#F8FAFC' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>Action Plan & Tips</h4>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '145%' }}>
            {selectedAlert.tip}
          </p>
        </div>

        {!selectedAlert.resolved ? (
          <button 
            className="primary-button" 
            style={{ width: '100%', padding: '14px' }}
            onClick={() => {
              resolveAlert(selectedAlert.id);
              setSelectedAlertId(null);
            }}
          >
            <Check size={18} /> Mark Alert as Resolved
          </button>
        ) : (
          <div style={{ textAlign: 'center', padding: '12px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-good)', borderRadius: '16px', fontWeight: 600 }}>
            ✓ Resolved Alert
          </div>
        )}
      </div>
    );
  }

  // Alerts Log List
  return (
    <div style={{ padding: '0 20px 30px 20px' }}>
      <div className="canvas-header" style={{ marginBottom: '24px' }}>
        <button 
          style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-main)' }}
          onClick={handleBack}
        >
          ← Back
        </button>
        <h1 className="canvas-title" style={{ fontSize: '24px' }}>Safety Alerts</h1>
        <div style={{ width: '40px' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {alerts.map(alert => (
          <div 
            key={alert.id} 
            className="card-decoration" 
            style={{ 
              padding: '16px', 
              borderLeft: `5px solid ${
                alert.resolved 
                  ? 'var(--color-good)' 
                  : alert.severity === 'critical' 
                    ? 'var(--color-critical)' 
                    : 'var(--color-warning)'
              }`,
              opacity: alert.resolved ? 0.6 : 1,
              cursor: 'pointer'
            }}
            onClick={() => setSelectedAlertId(alert.id)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{alert.title}</h4>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{alert.timeAgo}</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {alert.message}
            </p>
            {alert.resolved && (
              <span style={{ fontSize: '10px', color: 'var(--color-good)', fontWeight: 600, marginTop: '8px', display: 'block' }}>
                ✓ RESOLVED
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
