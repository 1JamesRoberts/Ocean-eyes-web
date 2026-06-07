import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { AlertItem } from '../../types/aquarium';

interface ActiveAlertsListProps {
  alerts: AlertItem[];
  onSelectAlert: (alertId: string) => void;
}

export const ActiveAlertsList: React.FC<ActiveAlertsListProps> = ({ alerts, onSelectAlert }) => {
  const activeAlerts = alerts.filter(a => !a.resolved);

  if (activeAlerts.length === 0) {
    return (
      <div className="card-decoration" style={{ textAlign: 'center', padding: '32px 16px', border: '1px dashed var(--color-border)' }}>
        <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>✓</span>
        <strong style={{ fontSize: '14px', color: 'var(--color-good)' }}>System Operating Safely</strong>
        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>No active safety alarms triggered.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '12px' }}>
        Active Safety Alerts
      </h3>
      
      {activeAlerts.map(alert => (
        <div 
          key={alert.id} 
          className="card-decoration" 
          style={{ 
            padding: '16px', 
            borderLeft: `4px solid ${alert.severity === 'critical' ? 'var(--color-critical)' : 'var(--color-warning)'}`,
            cursor: 'pointer'
          }}
          onClick={() => onSelectAlert(alert.id)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{alert.title}</h4>
            <ChevronRight size={16} style={{ color: 'var(--color-text-secondary)' }} />
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px', lineHeight: '135%' }}>
            {alert.message}
          </p>
        </div>
      ))}
    </div>
  );
};
