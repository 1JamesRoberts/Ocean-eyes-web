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
    <div className="
      flex min-h-[75px] items-center justify-between border-b border-border-card
      pb-3
      max-xs:flex-col max-xs:items-start max-xs:gap-3
    ">
      <div>
        <span className="block text-xs font-semibold text-text-muted uppercase">My Aquarium</span>
        {linkedTanks.length > 1 ? (
          <div ref={dropdownRef} className="relative mt-0.5 inline-block">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="
                flex cursor-pointer items-center gap-2 border-none
                bg-transparent p-0 text-left font-main text-display
                font-extrabold text-text-main outline-none
              "
            >
              <span>{currentTankName}</span>
              <ChevronDown
                size={22}
                className="
                  mt-1 text-text-muted transition-transform duration-200
                "
                style={{
                  transform: isOpen ? 'rotate(180deg)' : 'none',
                  transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              />
            </button>

            {isOpen && (
              <div className="
                absolute top-[calc(100%+8px)] left-0 z-1000 flex min-w-[220px]
                flex-col gap-1 rounded-2xl border border-border-card
                bg-surface-card p-1.5 shadow-card backdrop-blur-sm
              " style={{ boxShadow: 'var(--shadow-card), 0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                {tanks.filter(t => linkedTanks.includes(t.id)).map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      onSelectTank(t.id);
                      setIsOpen(false);
                    }}
                    className={`
                      w-full cursor-pointer rounded-[10px] border-none px-3
                      py-2.5 text-left font-main text-sm font-semibold
                      transition-colors
                      hover:bg-background-app
                      ${t.id === tankId ? `bg-info/8 text-primary-dark` : `
                        bg-transparent text-text-main
                      `}
                    `}
                  >
                    {t.name}
                  </button>
                ))}

                <div className="my-1 h-px bg-border-card" />

                <button
                  onClick={() => {
                    onAddTank();
                    setIsOpen(false);
                  }}
                  className="
                    flex w-full cursor-pointer items-center gap-1.5
                    rounded-[10px] border-none bg-transparent px-3 py-2.5
                    text-left font-main text-sm font-bold text-primary-dark
                  "
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
          <div className="flex items-center gap-3">
            <h1 className="
              mt-0.5 inline-block text-display font-extrabold text-text-main
            ">{activeTank?.name || 'Living Room Reef'}</h1>
            <button
              className="
                inline-flex cursor-pointer items-center gap-1 rounded-lg border
                border-border-card bg-surface-card px-2 py-1 text-caption
                font-semibold text-text-main transition-smooth
                hover:border-text-muted hover:bg-surface-hover
              "
              onClick={onAddTank}
            >
              <Plus size={10} className="text-primary-dark" />
              <span className="text-primary-dark">Add Tank</span>
            </button>
          </div>
        )}
      </div>

      {activeAlertCount > 0 && (
        <button
          onClick={onViewAlerts}
          className="
            relative flex cursor-pointer border-none bg-transparent p-1.5
            text-warning
          "
        >
          <AlertTriangle size={24} />
          <span className="
            absolute top-0.5 right-0.5 size-2.5 rounded-full border-2
            border-surface-card bg-critical
          " />
        </button>
      )}
    </div>
  );
};
