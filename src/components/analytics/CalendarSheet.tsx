// CalendarSheet.tsx - Apple-style month calendar for the analytics date picker
import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import {
  addUTCMonths,
  eachDayOfUTCInterval,
  endOfUTCMonth,
  endOfUTCWeek,
  formatUTCDate,
  isSameUTCDay,
  isSameUTCMonth,
  isTodayUTC,
  startOfUTCMonth,
  startOfUTCWeek,
  subUTCMonths,
} from '../../utils/dateUtc';

interface CalendarSheetProps {
  selectedDate: Date;
  onSelect: (date: Date) => void;
}

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export const CalendarSheet: React.FC<CalendarSheetProps> = ({
  selectedDate,
  onSelect,
}) => {
  const [viewMonth, setViewMonth] = useState(startOfUTCMonth(selectedDate));

  const days = useMemo(() => {
    const start = startOfUTCWeek(startOfUTCMonth(viewMonth));
    const end = endOfUTCWeek(endOfUTCMonth(viewMonth));
    return eachDayOfUTCInterval(start, end);
  }, [viewMonth]);

  return (
    <div className="w-[320px] glass-card p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="type-title">
            {formatUTCDate(viewMonth, 'MMMM yyyy')}
          </span>
          <ChevronDown size={16} className="text-text-muted" />
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setViewMonth((m) => subUTCMonths(m, 1))}
            className="
              cursor-pointer rounded-full border-none bg-transparent p-2
              text-text-muted transition-smooth
              hover:bg-surface-hover hover:text-text
            "
            aria-label="Previous month"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            onClick={() => setViewMonth((m) => addUTCMonths(m, 1))}
            className="
              cursor-pointer rounded-full border-none bg-transparent p-2
              text-text-muted transition-smooth
              hover:bg-surface-hover hover:text-text
            "
            aria-label="Next month"
          >
            <ChevronRight size={22} />
          </button>
        </div>
      </div>

      {/* Weekday labels */}
      <div className="mb-2 grid grid-cols-7 text-center">
        {WEEKDAYS.map((day) => (
          <span key={day} className="type-caption">
            {day}
          </span>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {days.map((day) => {
          const selected = isSameUTCDay(day, selectedDate);
          const today = isTodayUTC(day);
          const inMonth = isSameUTCMonth(day, viewMonth);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelect(day)}
              className={`
                relative mx-auto flex size-9 cursor-pointer items-center
                justify-center rounded-full border-none type-body
                transition-smooth
                ${selected
                  ? `glass-button-primary bg-primary-gradient text-text-inverse`
                  : today
                    ? `
                      bg-transparent type-strong text-brand
                      hover:bg-white/30
                    `
                    : inMonth
                      ? `
                        bg-transparent text-text
                        hover:bg-white/30
                      `
                      : 'bg-transparent text-text-muted/40'
                }
              `}
            >
              {formatUTCDate(day, 'd')}
              {today && !selected && (
                <span
                  className="
                    absolute bottom-1.5 left-1/2 size-1 -translate-x-1/2
                    rounded-full bg-brand
                  "
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
