import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Plus, ChevronDown } from 'lucide-react';
import { Button } from '../shared/Button';
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
                bg-transparent p-0 text-left font-main text-[28px]
                font-extrabold text-text-main outline-none
              "
            >
              <span>{currentTankName}</span>
              <ChevronDown
                size={22}
                className={`
                  mt-1 text-text-muted transition-transform duration-200
                  ease-in-out
                  ${isOpen ? 'rotate-180' : ''}
                `}
              />
            </button>

            {isOpen && (
              <div className="
                absolute top-[calc(100%+8px)] left-0 z-1000 flex min-w-[220px]
                flex-col gap-1 rounded-2xl border border-border-card
                bg-surface-card p-1.5 shadow-card backdrop-blur-sm
              ">
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
                      ${t.id === tankId
                        ? 'bg-primary-dark/8 text-primary-dark'
                        : `
                          bg-transparent text-text-main
                          hover:bg-background-app
                        `
                      }
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
                    hover:bg-background-app
                  "
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
              mt-0.5 inline-block text-[28px] font-extrabold text-text-main
            ">{activeTank?.name || 'Living Room Reef'}</h1>
            <Button
              variant="secondary"
              size="sm"
              className="
                inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px]
              "
              onClick={onAddTank}
            >
              <Plus size={10} />
              <span>Add Tank</span>
            </Button>
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
