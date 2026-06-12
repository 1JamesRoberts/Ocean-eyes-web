import React from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { useReadings } from '../../hooks/useReadings';
import { MiniClarityChart } from '../../components/analytics/MiniClarityChart';

export const HistoryDetailScreen: React.FC = () => {
  const { setActiveTab } = useNavigation();
  const { readings } = useReadings();

  return (
    <div className="flex flex-col gap-6">
      <div className="canvas-header">
        <div>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>History</span>
          <h1 className="canvas-title" style={{ marginTop: '2px' }}>Clarity Analytics</h1>
        </div>
        <button
          style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-main)' }}
          onClick={() => setActiveTab('home')}
        >
          ← Back
        </button>
      </div>

      {/* Main Clarity Area Chart */}
      <div className="card-decoration" style={{ padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Water Clarity Trend</span>
          <span style={{ fontSize: '11px', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary-dark)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
            Live Sync
          </span>
        </h3>
        
        <div style={{ width: '100%', padding: '10px 0' }}>
          <MiniClarityChart readings={readings} height={180} />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px', fontSize: '9px', color: 'var(--color-text-secondary)', fontWeight: 600, marginTop: '8px' }}>
          <span>OLDER</span>
          <span>RECENT SCANS</span>
          <span>TODAY</span>
        </div>
      </div>

      {/* Diagnostic Logs */}
      <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '12px' }}>Database Reading Log Entries</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {readings.slice(0, 8).map(reading => {
          const date = new Date(reading.timestamp);
          const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const day = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
          
          return (
            <div key={reading.id} className="card-decoration" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>Clarity: {reading.clarity}/10</strong>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  {day} · {time} · {reading.fish_count} fish visible
                </span>
              </div>
              <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                <span>pH {reading.ph}</span>
                <span>{reading.temp}°C</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
