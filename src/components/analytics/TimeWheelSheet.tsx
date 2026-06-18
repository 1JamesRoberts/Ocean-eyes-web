// TimeWheelSheet.tsx - Apple-style hour/minute/AM-PM scroll wheel
import React, { useMemo, useRef, useState } from 'react';

interface TimeWheelSheetProps {
  selectedTime: string; // HH:mm (24-hour)
  onSelect: (time: string) => void;
}

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const SNAP_TOP = Math.floor(VISIBLE_ITEMS / 2) * ITEM_HEIGHT;

function parseTime24(time: string): { hour: number; minute: number } {
  const [h, m] = time.split(':').map(Number);
  return { hour: Number.isNaN(h) ? 0 : h, minute: Number.isNaN(m) ? 0 : m };
}

function to24Hour(hour12: number, minute: number, ampm: 'AM' | 'PM'): string {
  let hour24 = hour12;
  if (ampm === 'PM' && hour12 !== 12) hour24 += 12;
  if (ampm === 'AM' && hour12 === 12) hour24 = 0;
  return `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

function from24To12(hour24: number): { hour12: number; ampm: 'AM' | 'PM' } {
  const ampm: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM';
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, ampm };
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const AMPM = ['AM', 'PM'] as const;

interface WheelColumnProps {
  items: (string | number)[];
  selected: string | number;
  onSelect: (value: string | number) => void;
}

const WheelColumn: React.FC<WheelColumnProps> = ({ items, selected, onSelect }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedIndex = items.findIndex((i) => String(i) === String(selected));

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTop = selectedIndex * ITEM_HEIGHT;
  }, [selectedIndex]);

  return (
    <div className="relative h-[220px] flex-1 overflow-hidden">
      <div
        ref={containerRef}
        className="
          h-full overflow-y-auto overscroll-none scroll-smooth py-[88px]
        "
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((item, index) => {
          const isSelected = String(item) === String(selected);
          return (
            <button
              key={String(item)}
              type="button"
              onClick={() => {
                onSelect(item);
                const container = containerRef.current;
                if (container) {
                  container.scrollTo({ top: index * ITEM_HEIGHT, behavior: 'smooth' });
                }
              }}
              className={`
                flex h-[44px] w-full cursor-pointer items-center justify-center
                border-none bg-transparent text-[22px] font-normal
                transition-colors
                ${isSelected ? 'text-text-main' : 'text-text-muted/45'}
              `}
            >
              {String(item).padStart(2, '0')}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const TimeWheelSheet: React.FC<TimeWheelSheetProps> = ({
  selectedTime,
  onSelect,
}) => {
  const { hour, minute } = useMemo(() => parseTime24(selectedTime), [selectedTime]);
  const { hour12, ampm } = useMemo(() => from24To12(hour), [hour]);

  const [localHour, setLocalHour] = useState(hour12);
  const [localMinute, setLocalMinute] = useState(minute);
  const [localAmpm, setLocalAmpm] = useState<'AM' | 'PM'>(ampm);

  const handleDone = () => {
    onSelect(to24Hour(localHour, localMinute, localAmpm));
  };

  return (
    <div className="w-[320px] p-4">
      <div className="relative flex rounded-2xl bg-surface-hover px-2 py-1">
        {/* Center highlight bar */}
        <div
          className="
            pointer-events-none absolute inset-x-2 rounded-xl bg-surface-card
          "
          style={{ top: SNAP_TOP, height: ITEM_HEIGHT }}
        />

        <WheelColumn
          items={HOURS}
          selected={localHour}
          onSelect={(v) => setLocalHour(Number(v))}
        />
        <WheelColumn
          items={MINUTES}
          selected={localMinute}
          onSelect={(v) => setLocalMinute(Number(v))}
        />
        <WheelColumn
          items={AMPM as unknown as string[]}
          selected={localAmpm}
          onSelect={(v) => setLocalAmpm(v as 'AM' | 'PM')}
        />
      </div>

      <button
        type="button"
        onClick={handleDone}
        className="
          mt-3 w-full cursor-pointer rounded-full border-none bg-critical py-2.5
          text-[15px] font-semibold text-white
          hover:opacity-90
        "
      >
        Done
      </button>
    </div>
  );
};
