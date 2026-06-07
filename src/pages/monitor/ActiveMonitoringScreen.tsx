import React, { useState } from 'react';
import { useTank } from '../../hooks/useTank';
import { useReadings } from '../../hooks/useReadings';
import { useFish } from '../../hooks/useFish';
import { MockFirestore } from '../../services/mock_service';
import type { AlertItem } from '../../types/aquarium';

interface ScreenProps {
  onNavigate: (screen: 'welcome' | 'qr' | 'calibration' | 'active') => void;
}

export const ActiveMonitoringScreen: React.FC<ScreenProps> = ({ onNavigate }) => {
  const { activeTank: contextActiveTank, tanks } = useTank();
  const { readings } = useReadings();
  const { fishList } = useFish(contextActiveTank?.id ?? null);
  const activeTank = contextActiveTank || (tanks.length > 0 ? tanks[0] : null);
  const [simClarityIssue, setSimClarityIssue] = useState(false);

  const latestReading = readings[0] || {
    clarity: 1.2,
    fish_count: 0,
    ph: 7.2,
    temp: 26.1
  };

  // Modulate local metrics scan trigger with simulations
  const displayClarity = simClarityIssue ? 8.5 : latestReading.clarity;
  const displayFish = latestReading.fish_count;
  const totalFish = fishList.reduce((sum, f) => sum + f.count, 0);

  // Background mock state write
  const triggerSimulationMetrics = () => {
    if (!activeTank) return;
    
    // Simulate drop or restore
    MockFirestore.writeReading({
      tankId: activeTank.id,
      clarity: displayClarity,
      fishCount: displayFish,
      ph: 7.2,
      temp: 26.1,
      ammonia: simClarityIssue ? 0.05 : 0.0,
      nitrite: simClarityIssue ? 0.25 : 0.08
    });

    if (simClarityIssue) {
      const activeAlerts = MockFirestore.getAlerts();
      const existing = activeAlerts.find((a: AlertItem) => !a.resolved && a.title.includes('clarity'));
      if (!existing) {
        const newAlerts = [...activeAlerts];
        newAlerts.unshift({
          id: `alert-c-${Date.now()}`,
          title: 'Water clarity dropped',
          message: `Water turbidity rose to ${displayClarity} FNU (Threshold: ${activeTank.thresholds.clarity_min}). Check filter unit.`,
          tip: 'A sudden clarity drop indicates a clogged filter sponge or disturbed substrate. Wash the filter media or perform a 20% water change.',
          severity: 'warning',
          timeAgo: 'Just now',
          clarityBefore: '2.5',
          clarityAfter: displayClarity.toString(),
          fishBefore: totalFish.toString(),
          fishAfter: displayFish.toString(),
          resolved: false,
          timestamp: new Date().toISOString()
        });
        MockFirestore.saveAlerts(newAlerts);
      }
    }


  };

  const waterHeightPct = activeTank?.calibration ? Math.min(100, Math.max(0, ((240 - activeTank.calibration.water_line_y) / 240) * 100)) : 50;

  return (
    <div style={{
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      color: '#FFFFFF',
      background: '#090D11'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Active Stream Feed</span>
        {activeTank && (
          <span style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 600 }}>
            {activeTank.name}
          </span>
        )}
      </div>

      {/* Live aquatic scanner simulation */}
      <div style={{
        flex: 1,
        borderRadius: '8px',
        border: '1px solid #1E293B',
        position: 'relative',
        overflow: 'hidden',
        background: 'radial-gradient(circle at center, #1E293B 0%, #0F172A 100%)',
        marginBottom: '16px'
      }}>
        <div className="camera-grid" />
        <div className="camera-scanline" />

        {/* Visual Water Body Representation of Tank */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: `${waterHeightPct}%`,
          background: 'linear-gradient(180deg, rgba(20, 184, 166, 0.3) 0%, rgba(13, 148, 136, 0.5) 100%)',
          borderTop: '2px dashed rgba(255, 255, 255, 0.4)',
          zIndex: 1,
          pointerEvents: 'none'
        }}>
          {/* Bubbles */}
          <div style={{ position: 'absolute', bottom: '15%', left: '20%', fontSize: '12px', opacity: 0.3 }} className="anim-float-1">🫧</div>
          <div style={{ position: 'absolute', bottom: '45%', right: '15%', fontSize: '10px', opacity: 0.2 }} className="anim-float-2">🫧</div>
          <div style={{ position: 'absolute', bottom: '70%', left: '50%', fontSize: '14px', opacity: 0.4 }} className="anim-float-1">🫧</div>
        </div>

        {/* Sand/Substrate Bed */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '20px',
          background: 'linear-gradient(0deg, #0F172A 0%, #1E293B 100%)',
          borderTop: '1px solid #334155',
          zIndex: 2,
          pointerEvents: 'none'
        }} />

        {/* Glass Tank Frame Reflection */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          boxShadow: 'inset 0 0 20px rgba(56, 189, 248, 0.15)',
          border: '2px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '8px',
          pointerEvents: 'none',
          zIndex: 15
        }} />

        {/* Live scanner target graphics */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          fontFamily: 'monospace',
          fontSize: '9px',
          color: '#34D399',
          lineHeight: '130%',
          textShadow: '0 0 4px rgba(52, 211, 153, 0.4)',
          zIndex: 12
        }}>
          <span>CAM FEED: OK</span><br />
          <span>RESOLUTION: 1080P</span><br />
          <span>FPS: 30.00</span>
        </div>

        {/* Bounding box graphics simulating AI detection */}
        <div style={{
          position: 'absolute',
          top: '30%',
          left: '25%',
          width: '80px',
          height: '60px',
          border: '1.5px solid #34D399',
          boxShadow: '0 0 6px rgba(52, 211, 153, 0.3)',
          zIndex: 12
        }}>
          <span style={{ position: 'absolute', top: '-14px', left: 0, fontSize: '8px', color: '#FFF', background: '#34D399', padding: '1px 3px', fontWeight: 700 }}>
            NEON TETRA 98%
          </span>
        </div>

        <div style={{
          position: 'absolute',
          bottom: '25%',
          right: '25%',
          width: '70px',
          height: '50px',
          border: '1.5px solid #34D399',
          boxShadow: '0 0 6px rgba(52, 211, 153, 0.3)',
          zIndex: 12
        }}>
          <span style={{ position: 'absolute', top: '-14px', left: 0, fontSize: '8px', color: '#FFF', background: '#34D399', padding: '1px 3px', fontWeight: 700 }}>
            GUPPY 94%
          </span>
        </div>

        {/* Dynamic Water Line Calibration Overlay */}
        {activeTank?.calibration && (
          <div style={{
            position: 'absolute',
            top: `${Math.min(100, Math.max(0, (activeTank.calibration.water_line_y / 240) * 100))}%`,
            left: 0,
            width: '100%',
            height: '2px',
            borderTop: '2px dashed rgba(255,255,255,0.3)',
            zIndex: 10,
            pointerEvents: 'none'
          }} />
        )}
      </div>

      {/* Grid of monitored stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <div style={{ background: '#0F172A', padding: '10px', borderRadius: '8px', border: '1px solid #1E293B' }}>
          <span style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>VISIBILITY COUNT</span>
          <strong style={{ fontSize: '16px', color: '#38BDF8' }}>{displayFish} fish detected</strong>
        </div>

        <div style={{ background: '#0F172A', padding: '10px', borderRadius: '8px', border: '1px solid #1E293B' }}>
          <span style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>WATER CLARITY</span>
          <strong style={{ fontSize: '16px', color: '#38BDF8' }}>{displayClarity.toFixed(2)} FNU</strong>
        </div>
      </div>

      {/* Simulator triggers */}
      <div className="card-decoration" style={{ padding: '12px', border: '1px dashed #1E293B', backgroundColor: 'transparent', marginBottom: '16px' }}>
        <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, display: 'block', textTransform: 'uppercase', marginBottom: '8px' }}>
          Aquarium Simulator Controls
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button 
            style={{
              padding: '8px 10px',
              fontSize: '11px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: simClarityIssue ? 'var(--color-critical)' : '#1E293B',
              color: '#FFF'
            }}
            onClick={() => {
              setSimClarityIssue(prev => !prev);
              setTimeout(triggerSimulationMetrics, 50);
            }}
          >
            {simClarityIssue ? 'Restore Clarity' : 'Trigger Clog Filter'}
          </button>

          {/* Fish hiding simulation removed — AI detection is the sole source of truth */}
        </div>
      </div>

      <button 
        className="secondary-button" 
        style={{ width: '100%', padding: '10px', fontSize: '13px', borderRadius: '10px', backgroundColor: 'transparent', borderColor: '#334155', color: '#94A3B8' }}
        onClick={() => onNavigate('welcome')}
      >
        Exit Active Monitoring
      </button>
    </div>
  );
};
