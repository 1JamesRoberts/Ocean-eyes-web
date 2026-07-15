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
    <div className="w-full max-w-[320px] p-4 pb-3 text-text">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="type-title">
            {formatUTCDate(viewMonth, 'MMMM yyyy')}
          </span>
          <ChevronDown size={18} className="text-text-muted" />
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setViewMonth((m) => subUTCMonths(m, 1))}
            className="
              overlay-glass-control flex size-9 items-center justify-center rounded-full
              p-0 text-text-muted hover:text-text
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand
            "
            aria-label="Previous month"
          >
            <ChevronLeft size={18} className="text-text-muted" />
          </button>
          <button
            type="button"
            onClick={() => setViewMonth((m) => addUTCMonths(m, 1))}
            className="
              overlay-glass-control flex size-9 items-center justify-center rounded-full
              p-0 text-text-muted hover:text-text
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand
            "
            aria-label="Next month"
          >
            <ChevronRight size={18} className="text-text-muted" />
          </button>
        </div>
      </div>

      {/* Weekday labels */}
      <div className="mb-2 grid grid-cols-7 text-center">
        {WEEKDAYS.map((day) => (
          <span key={day} className="type-caption text-text-muted">
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
                justify-center type-body
                ${selected
                  ? `rounded-full fish-count-teal-outline type-strong text-white`
                  : `rounded-md type-body ${today
                      ? 'type-strong text-text'
                      : inMonth
                        ? 'text-text hover:text-brand'
                        : 'text-text-muted/60 hover:text-text-muted'}`}
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand
              `}
            >
              {formatUTCDate(day, 'd')}
              {today && !selected && (
                <span
                  className="
                    absolute bottom-1.5 left-1/2 size-1 -translate-x-1/2
                    rounded-full bg-brand-bright
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
