import React from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { useReadings } from '../../hooks/useReadings';

export const HistoryDetailScreen: React.FC = () => {
  const { setActiveTab } = useNavigation();
  const { readings } = useReadings();

  // Draw a beautiful custom SVG area chart representing historical clarity values
  const drawClarityChart = () => {
    if (readings.length === 0) return null;
    const history = [...readings].reverse().slice(-7); // Reverse so oldest is left, last 7 entries
    const width = 800; // Expanded logical width for a premium widescreen layout
    const height = 180; // Expanded logical height for high detail on desktop
    const maxVal = 10;
    const minVal = 0;
    const padding = 25; // Adjusted padding for balance
    
    const points = history.map((r, idx) => {
      const x = padding + (idx * (width - 2 * padding) / (history.length - 1));
      const y = height - padding - ((r.clarity - minVal) * (height - 2 * padding) / (maxVal - minVal));
      return { x, y, clarity: r.clarity, time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    });

    const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');
    
    // Fill area below chart
    const areaPoints = `${points[0].x},${height - padding} ${polylinePoints} ${points[points.length - 1].x},${height - padding}`;

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible', width: '100%', display: 'block' }}>
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-info)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--color-info)" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {/* Horizontal grid lines */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--color-border)" strokeWidth="1" />
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="3 3" />
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="3 3" />
        
        {/* Filled Area */}
        <polygon points={areaPoints} fill="url(#chartGrad)" />

        {/* Main Line */}
        <polyline fill="none" stroke="var(--color-info)" strokeWidth="3" points={polylinePoints} strokeLinecap="round" />

        {/* Data points dots */}
        {points.map((p, idx) => (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r="5" fill="var(--color-info)" stroke="#FFFFFF" strokeWidth="2.5" />
            <text x={p.x} y={p.y - 10} fontSize="10" fontWeight="700" textAnchor="middle" fill="var(--color-text-primary)">
              {p.clarity}
            </text>
          </g>
        ))}
      </svg>
    );
  };

  return (
    <div style={{ padding: '0 20px 30px 20px' }}>
      <div className="canvas-header" style={{ marginBottom: '24px' }}>
        <button 
          style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-main)' }}
          onClick={() => setActiveTab('home')}
        >
          ← Back
        </button>
        <h1 className="canvas-title" style={{ fontSize: '24px' }}>Clarity Analytics</h1>
        <div style={{ width: '40px' }} />
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
          {drawClarityChart()}
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
