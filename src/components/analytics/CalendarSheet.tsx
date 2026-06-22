// CalendarSheet.tsx - Apple-style month calendar for the analytics date picker
import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '../shared/Button';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';

interface CalendarSheetProps {
  selectedDate: Date;
  onSelect: (date: Date) => void;
}

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export const CalendarSheet: React.FC<CalendarSheetProps> = ({
  selectedDate,
  onSelect,
}) => {
  const [viewMonth, setViewMonth] = useState(startOfMonth(selectedDate));

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth));
    const end = endOfWeek(endOfMonth(viewMonth));
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  return (
    <div className="w-[320px] p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-lg font-bold text-text-main">
            {format(viewMonth, 'MMMM yyyy')}
          </span>
          <ChevronDown size={16} className="text-text-muted" />
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full p-2"
            onClick={() => setViewMonth((m) => subMonths(m, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft size={22} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full p-2"
            onClick={() => setViewMonth((m) => addMonths(m, 1))}
            aria-label="Next month"
          >
            <ChevronRight size={22} />
          </Button>
        </div>
      </div>

      {/* Weekday labels */}
      <div className="mb-2 grid grid-cols-7 text-center">
        {WEEKDAYS.map((day) => (
          <span key={day} className="text-[11px] font-medium text-text-muted">
            {day}
          </span>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {days.map((day) => {
          const selected = isSameDay(day, selectedDate);
          const today = isToday(day);
          const inMonth = isSameMonth(day, viewMonth);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelect(day)}
              className={`
                relative mx-auto flex size-9 cursor-pointer items-center
                justify-center rounded-full border-none text-[15px] font-medium
                transition-smooth
                ${selected
                  ? 'bg-primary-gradient text-text-inv shadow-button'
                  : today
                    ? `
                      bg-transparent font-semibold text-primary-dark
                      hover:bg-surface-hover
                    `
                    : inMonth
                      ? `
                        bg-transparent text-text-main
                        hover:bg-surface-hover
                      `
                      : 'bg-transparent text-text-muted/40'
                }
              `}
            >
              {format(day, 'd')}
              {today && !selected && (
                <span
                  className="
                    absolute bottom-1.5 left-1/2 size-1 -translate-x-1/2
                    rounded-full bg-primary-dark
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
