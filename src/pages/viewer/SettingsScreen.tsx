import React, { useState } from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { useTank } from '../../hooks/useTank';
import { useTheme } from '../../hooks/useTheme';
import { MockFirestore } from '../../services/mock_service';
import { ChevronRight, Sun, Moon } from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const { setActiveTab } = useNavigation();
  const { activeTank, unlinkTank, updateTankName } = useTank();
  const { isDarkMode, setIsDarkMode } = useTheme();
  const [name, setName] = useState(activeTank?.name || 'Living Room Reef');
  const [editing, setEditing] = useState(false);
  const [showConfirmUnlink, setShowConfirmUnlink] = useState(false);

  const handleNameChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    updateTankName(name.trim());
    setEditing(false);
  };

  return (
    <div style={{ padding: '0 20px 30px 20px' }}>
      <div className="canvas-header" style={{ marginBottom: '24px' }}>
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
                fontFamily: 'var(--font-main)'
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

      {/* Theme & Appearance */}
      <div className="card-decoration" style={{ padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isDarkMode ? <Moon size={18} color="var(--color-primary)" /> : <Sun size={18} color="var(--color-primary)" />}
          <span>Theme & Appearance</span>
        </h3>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Dark Theme Mode</span>
            <span style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              Switch dashboard colors to high contrast slate dark styling.
            </span>
          </div>
          
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0
            }}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            <div style={{
              width: '50px',
              height: '26px',
              borderRadius: '13px',
              backgroundColor: isDarkMode ? 'var(--color-primary)' : 'var(--color-border)',
              position: 'relative',
              transition: 'var(--transition-smooth)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                position: 'absolute',
                top: '3px',
                left: isDarkMode ? '29px' : '3px',
                transition: 'var(--transition-smooth)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {isDarkMode ? <Moon size={10} color="var(--color-primary)" /> : <Sun size={10} color="#F59E0B" />}
              </div>
            </div>
          </button>
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
        <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '16px' }}>Safety Boundaries & Notification Thresholds</h4>
        
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Maximum FNU Threshold</span>
            <strong style={{ color: 'var(--color-primary)' }}>{activeTank?.thresholds.clarity_min || 6.0} FNU</strong>
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
              MockFirestore.updateThresholds(activeTank!.id, val, fishPct);
              window.dispatchEvent(new CustomEvent('oceaneyes_db_update'));
            }}
            style={{ width: '100%', accentColor: 'var(--color-primary)' }}
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Discrepancy Alarm Trigger</span>
            <strong style={{ color: 'var(--color-primary)' }}>{activeTank?.thresholds.fish_change_pct || 50.0}% visibility</strong>
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
              MockFirestore.updateThresholds(activeTank!.id, clar, val);
              window.dispatchEvent(new CustomEvent('oceaneyes_db_update'));
            }}
            style={{ width: '100%', accentColor: 'var(--color-primary)' }}
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
