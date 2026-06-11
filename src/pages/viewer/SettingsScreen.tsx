import React, { useState, useRef } from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { useTank } from '../../hooks/useTank';
import { ChevronRight } from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const { setActiveTab } = useNavigation();
  const { activeTank, unlinkTank, updateTankName, updateThresholds } = useTank();
  const [name, setName] = useState(activeTank?.name || 'Living Room Reef');
  const [editing, setEditing] = useState(false);
  const [showConfirmUnlink, setShowConfirmUnlink] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedUpdateThresholds = (clarityMin: number, fishPct: number) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      updateThresholds(clarityMin, fishPct);
    }, 300);
  };

  const flushThresholds = (clarityMin: number, fishPct: number) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = null;
    updateThresholds(clarityMin, fishPct);
  };

  const handleNameChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    updateTankName(name.trim());
    setEditing(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="canvas-header">
        <div>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Control Panel</span>
          <h1 className="canvas-title" style={{ marginTop: '2px' }}>Tank Settings</h1>
        </div>
      </div>

      {/* Tank Identity */}
      <div className="card-decoration" style={{ padding: '20px', marginBottom: '20px' }}>
        {editing ? (
          <form onSubmit={handleNameChange} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid var(--color-border)',
                outline: 'none',
                fontFamily: 'var(--font-main)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-primary)'
              }}
            />
            <button className="primary-button" style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '10px' }} type="submit">
              Save
            </button>
          </form>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Tank Name</span>
              <strong style={{ fontSize: '18px', display: 'block', color: 'var(--color-text-primary)', marginTop: '2px' }}>
                {activeTank?.name}
              </strong>
            </div>
            <button
              className="secondary-button"
              style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '12px' }}
              onClick={() => setEditing(true)}
            >
              Rename
            </button>
          </div>
        )}

        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--color-border)', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
          <span>Tank Reference Code: </span>
          <code style={{ fontSize: '11px', padding: '2px 6px', display: 'inline-block', verticalAlign: 'middle', marginLeft: '4px' }}>
            {activeTank?.id}
          </code>
        </div>
      </div>

      {/* Menu Options */}
      <div className="card-decoration" style={{ padding: '4px 16px', marginBottom: '20px' }}>
        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}
          onClick={() => setActiveTab('my_fish')}
        >
          <span style={{ fontSize: '15px', fontWeight: 600 }}>Manage Fish Inventory</span>
          <ChevronRight size={18} style={{ color: 'var(--color-text-secondary)' }} />
        </div>

        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}
          onClick={() => setActiveTab('history')}
        >
          <span style={{ fontSize: '15px', fontWeight: 600 }}>Water Clarity Reports</span>
          <ChevronRight size={18} style={{ color: 'var(--color-text-secondary)' }} />
        </div>

        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}
          onClick={() => setActiveTab('alerts')}
        >
          <span style={{ fontSize: '15px', fontWeight: 600 }}>Safety Alert Logs</span>
          <ChevronRight size={18} style={{ color: 'var(--color-text-secondary)' }} />
        </div>

        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', cursor: 'pointer' }}
          onClick={() => setActiveTab('monitor')}
        >
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-primary)' }}>IoT Scanner Console</span>
          <ChevronRight size={18} style={{ color: 'var(--color-primary)' }} />
        </div>
      </div>

      {/* Safety Threshold Settings Slider equivalent */}
      <div className="card-decoration" style={{ padding: '20px', marginBottom: '24px' }}>
        <h4 className="text-sm font-bold text-[var(--color-text-primary)] mb-4">Safety Boundaries & Notification Thresholds</h4>

        <div className="mb-4">
          <div className="flex justify-between text-[13px] mb-1.5">
            <span className="text-[var(--color-text-secondary)]">Maximum FNU Threshold</span>
            <strong className="text-[var(--color-primary)]">{activeTank?.thresholds.clarity_min || 6.0} FNU</strong>
          </div>
          <input
            type="range"
            min="1.0"
            max="10.0"
            step="0.5"
            value={activeTank?.thresholds.clarity_min || 6.0}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              const fishPct = activeTank?.thresholds.fish_change_pct || 50.0;
              debouncedUpdateThresholds(val, fishPct);
            }}
            onMouseUp={(e) => {
              const val = parseFloat((e.target as HTMLInputElement).value);
              const fishPct = activeTank?.thresholds.fish_change_pct || 50.0;
              flushThresholds(val, fishPct);
            }}
            onTouchEnd={(e) => {
              const val = parseFloat((e.target as HTMLInputElement).value);
              const fishPct = activeTank?.thresholds.fish_change_pct || 50.0;
              flushThresholds(val, fishPct);
            }}
            className="w-full"
            style={{ accentColor: 'var(--color-primary-dark)' }}
          />
        </div>

        <div>
          <div className="flex justify-between text-[13px] mb-1.5">
            <span className="text-[var(--color-text-secondary)]">Discrepancy Alarm Trigger</span>
            <strong className="text-[var(--color-primary)]">{activeTank?.thresholds.fish_change_pct || 50.0}% visibility</strong>
          </div>
          <input
            type="range"
            min="20"
            max="80"
            step="10"
            value={activeTank?.thresholds.fish_change_pct || 50.0}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              const clar = activeTank?.thresholds.clarity_min || 6.0;
              debouncedUpdateThresholds(clar, val);
            }}
            onMouseUp={(e) => {
              const val = parseInt((e.target as HTMLInputElement).value);
              const clar = activeTank?.thresholds.clarity_min || 6.0;
              flushThresholds(clar, val);
            }}
            onTouchEnd={(e) => {
              const val = parseInt((e.target as HTMLInputElement).value);
              const clar = activeTank?.thresholds.clarity_min || 6.0;
              flushThresholds(clar, val);
            }}
            className="w-full"
            style={{ accentColor: 'var(--color-primary-dark)' }}
          />
        </div>
      </div>

      {/* Disconnect button with confirmation */}
      {showConfirmUnlink ? (
        <div className="card-decoration" style={{ padding: '20px', border: '1px solid var(--color-critical)', backgroundColor: 'rgba(239, 68, 68, 0.05)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <strong style={{ fontSize: '14px', color: 'var(--color-critical)' }}>Are you sure you want to disconnect?</strong>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: '140%' }}>
            This will remove "{activeTank?.name}" from your active monitoring dashboard. You can reconnect it later using the reference code: <code>{activeTank?.id}</code>.
          </p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button
              className="secondary-button"
              style={{ flex: 1, padding: '8px', fontSize: '12px', borderRadius: '10px' }}
              onClick={() => setShowConfirmUnlink(false)}
            >
              Cancel
            </button>
            <button
              className="primary-button"
              style={{ flex: 1, padding: '8px', fontSize: '12px', borderRadius: '10px', backgroundColor: 'var(--color-critical)', borderColor: 'var(--color-critical)' }}
              onClick={() => { unlinkTank(); setActiveTab('home'); }}
            >
              Yes, Disconnect
            </button>
          </div>
        </div>
      ) : (
        <button
          className="secondary-button"
          style={{ width: '100%', color: 'var(--color-critical)', borderColor: 'rgba(239, 68, 68, 0.2)', padding: '14px' }}
          onClick={() => setShowConfirmUnlink(true)}
        >
          Disconnect from Tank
        </button>
      )}
    </div>
  );
};
