import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Plus, ChevronDown } from 'lucide-react';
import type { TankBrief } from '../../types/aquarium';

interface TankHeaderProps {
  activeTank: TankBrief | undefined;
  linkedTanks: string[];
  tanks: TankBrief[];
  tankId: string | null;
  activeAlertCount: number;
  onSelectTank: (id: string) => void;
  onAddTank: () => void;
  onViewAlerts: () => void;
}

export const TankHeader: React.FC<TankHeaderProps> = ({
  activeTank,
  linkedTanks,
  tanks,
  tankId,
  activeAlertCount,
  onSelectTank,
  onAddTank,
  onViewAlerts
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentTankName = activeTank?.name || 'Select Tank';

  return (
    <div className="canvas-header">
      <div>
        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>My Aquarium</span>
        {linkedTanks.length > 1 ? (
          <div ref={dropdownRef} style={{ position: 'relative', marginTop: '2px', display: 'inline-block' }}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-main)',
                fontSize: '28px',
                fontWeight: 800,
                outline: 'none',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textAlign: 'left'
              }}
            >
              <span>{currentTankName}</span>
              <ChevronDown 
                size={22} 
                style={{ 
                  color: 'var(--color-text-secondary)', 
                  marginTop: '4px', 
                  transform: isOpen ? 'rotate(180deg)' : 'none', 
                  transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)' 
                }} 
              />
            </button>

            {isOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                minWidth: '220px',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '16px',
                boxShadow: 'var(--shadow-card), 0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                padding: '6px',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                backdropFilter: 'blur(8px)',
              }}>
                {tanks.filter(t => linkedTanks.includes(t.id)).map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      onSelectTank(t.id);
                      setIsOpen(false);
                    }}
                    style={{
                      background: t.id === tankId ? 'rgba(0, 116, 217, 0.08)' : 'transparent',
                      border: 'none',
                      borderRadius: '10px',
                      color: t.id === tankId ? 'var(--color-primary)' : 'var(--color-text-primary)',
                      padding: '10px 12px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'var(--font-main)',
                      transition: 'background-color 0.15s ease',
                      width: '100%'
                    }}
                    onMouseEnter={(e) => {
                      if (t.id !== tankId) e.currentTarget.style.backgroundColor = 'var(--color-background)';
                    }}
                    onMouseLeave={(e) => {
                      if (t.id !== tankId) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {t.name}
                  </button>
                ))}
                
                <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '4px 0' }} />
                
                <button
                  onClick={() => {
                    onAddTank();
                    setIsOpen(false);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '10px',
                    color: 'var(--color-primary)',
                    padding: '10px 12px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'var(--font-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    width: '100%'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-background)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Plus size={14} />
                  <span>Add Tank...</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 className="canvas-title" style={{ marginTop: '2px', display: 'inline-block' }}>{activeTank?.name || 'Living Room Reef'}</h1>
            <button 
              className="secondary-button" 
              style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              onClick={onAddTank}
            >
              <Plus size={10} style={{ color: 'var(--color-primary)' }} />
              <span style={{ color: 'var(--color-primary-dark)' }}>Add Tank</span>
            </button>
          </div>
        )}
      </div>
      
      {activeAlertCount > 0 && (
        <button 
          onClick={onViewAlerts}
          style={{
            background: 'none',
            border: 'none',
            position: 'relative',
            cursor: 'pointer',
            color: 'var(--color-warning)',
            display: 'flex',
            padding: '6px'
          }}
        >
          <AlertTriangle size={24} />
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-critical)',
            border: '2px solid var(--color-surface)'
          }} />
        </button>
      )}
    </div>
  );
};
