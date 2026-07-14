// TimeWheelSheet.tsx - Apple-style hour/minute/AM-PM scroll wheel
import React, { useMemo, useRef, useState } from 'react';
import { GlassButton } from '../shared';

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
    <div className="shimmer h-[220px] flex-1">
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
                border-none bg-transparent type-body
                transition-colors
                ${isSelected ? 'type-strong text-text' : 'text-text-muted/60'}
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
    <div className="w-full max-w-[320px] p-4 pb-3 text-text">
      <div className="relative flex rounded-2xl px-2 py-1">
        {/* Center highlight bar */}
        <div
          className="
            pointer-events-none absolute inset-x-2 rounded-xl border fish-count-teal-outline
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

      <GlassButton variant="primary" size="sm" className="mt-3 w-full" onClick={handleDone}>
        Done
      </GlassButton>
    </div>
  );
};
