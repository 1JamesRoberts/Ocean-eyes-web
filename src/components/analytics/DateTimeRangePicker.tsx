// DateTimeRangePicker.tsx - Apple-style Starts/Ends date-time range selector
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, CalendarDays } from 'lucide-react';
import { parseISO } from 'date-fns';
import type { DateRange } from '../../types/aquarium';
import {
  formatDateForDisplay,
  formatTimeForDisplay,
  toISODate,
} from '../../utils/formatters';
import { CalendarSheet } from './CalendarSheet';
import { DateTimePill } from './DateTimePill';
import { TimeWheelSheet } from './TimeWheelSheet';

type ActiveField = 'startDate' | 'startTime' | 'endDate' | 'endTime' | null;

interface DateTimeRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

interface OpenState {
  field: ActiveField;
  anchorRect: DOMRect;
}

export const DateTimeRangePicker: React.FC<DateTimeRangePickerProps> = ({
  value,
  onChange,
}) => {
  const [open, setOpen] = useState<OpenState | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const activeField = open?.field ?? null;

  const summaryText = useMemo(() => {
    const startDate = formatDateForDisplay(value.startDate);
    const endDate = formatDateForDisplay(value.endDate);
    const startTime = formatTimeForDisplay(value.startTime);
    const endTime = formatTimeForDisplay(value.endTime);

    if (value.startDate === value.endDate) {
      return `${startDate} · ${startTime} – ${endTime}`;
    }
    return `${startDate}, ${startTime} – ${endDate}, ${endTime}`;
  }, [value]);

  const selectedDateForCalendar = useMemo(() => {
    const dateStr =
      activeField === 'startDate' || activeField === 'startTime'
        ? value.startDate
        : activeField === 'endDate' || activeField === 'endTime'
          ? value.endDate
          : value.startDate;
    return parseISO(dateStr);
  }, [activeField, value]);

  const selectedTimeForWheel = useMemo(() => {
    const timeStr =
      activeField === 'startDate' || activeField === 'startTime'
        ? value.startTime
        : activeField === 'endDate' || activeField === 'endTime'
          ? value.endTime
          : value.startTime;
    return timeStr;
  }, [activeField, value]);

  const popoverStyle = useMemo<React.CSSProperties>(() => {
    if (!open) return {};
    return {
      position: 'fixed',
      top: open.anchorRect.bottom + 8,
      left: open.anchorRect.left,
      zIndex: 1000,
    };
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setOpen(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handlePillClick = useCallback(
    (field: ActiveField) =>
      (event: React.MouseEvent<HTMLButtonElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setOpen((prev) =>
          prev?.field === field
            ? null
            : { field, anchorRect: rect },
        );
      },
    [],
  );

  const handleClose = useCallback(() => setOpen(null), []);

  const handleDateSelect = useCallback(
    (date: Date) => {
      const dateStr = toISODate(date);
      if (activeField === 'startDate') {
        const next: DateRange = {
          ...value,
          startDate: dateStr,
          endDate: dateStr > value.endDate ? dateStr : value.endDate,
        };
        onChange(next);
      } else if (activeField === 'endDate') {
        const next: DateRange = {
          ...value,
          endDate: dateStr,
          startDate: dateStr < value.startDate ? dateStr : value.startDate,
        };
        onChange(next);
      }
      handleClose();
    },
    [activeField, onChange, value, handleClose],
  );

  const handleTimeSelect = useCallback(
    (time: string) => {
      if (activeField === 'startTime') {
        onChange({ ...value, startTime: time });
      } else if (activeField === 'endTime') {
        onChange({ ...value, endTime: time });
      }
      handleClose();
    },
    [activeField, onChange, value, handleClose],
  );

  const isCalendar = activeField === 'startDate' || activeField === 'endDate';
  const isTimeWheel = activeField === 'startTime' || activeField === 'endTime';

  const toggleExpanded = useCallback(
    () => setIsExpanded((prev) => !prev),
    [],
  );

  return (
    <div ref={containerRef} className="relative">
      {/* Summary button — always visible, stays static */}
      <button
        type="button"
        onClick={toggleExpanded}
        aria-expanded={isExpanded}
        aria-controls="date-range-editor"
        className="
          flex cursor-pointer items-center gap-2 rounded-full border-none
          bg-surface-hover px-4 py-2.5 text-h3 font-medium whitespace-nowrap
          text-text-main transition-colors
          hover:bg-border-card
        "
      >
        <CalendarDays size={16} className="text-text-muted" />
        <span>{summaryText}</span>
        <ChevronDown
          size={16}
          className={`
            text-text-muted transition-transform duration-300 ease-in-out
            ${isExpanded ? 'rotate-180' : ''}
          `}
        />
      </button>

      {/* Collapsible Starts / Ends rows — slides out below without shifting layout */}
      <div
        id="date-range-editor"
        className="
          absolute left-0 z-50 w-full overflow-hidden glass-card p-3
          transition-all duration-300 ease-in-out
        "
        style={{
          top: 'calc(100% + 8px)',
          maxHeight: isExpanded ? 200 : 0,
          opacity: isExpanded ? 1 : 0,
          pointerEvents: isExpanded ? 'auto' : 'none' as const,
        }}
        aria-label="Date range editor"
      >
        <div className="flex flex-col gap-2">
          {/* Starts row */}
          <div className="flex items-center gap-2">
            <span className="w-14 text-lg font-medium text-text-main">Starts</span>
            <DateTimePill
              label={formatDateForDisplay(value.startDate)}
              isActive={activeField === 'startDate'}
              onClick={handlePillClick('startDate')}
            />
            <DateTimePill
              label={formatTimeForDisplay(value.startTime)}
              isActive={activeField === 'startTime'}
              onClick={handlePillClick('startTime')}
            />
          </div>

          {/* Ends row */}
          <div className="flex items-center gap-2">
            <span className="w-14 text-lg font-medium text-text-main">Ends</span>
            <DateTimePill
              label={formatDateForDisplay(value.endDate)}
              isActive={activeField === 'endDate'}
              onClick={handlePillClick('endDate')}
            />
            <DateTimePill
              label={formatTimeForDisplay(value.endTime)}
              isActive={activeField === 'endTime'}
              onClick={handlePillClick('endTime')}
            />
          </div>
        </div>
      </div>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className="animate-fade-in glass-card"
            style={popoverStyle}
          >
            {isCalendar && (
              <CalendarSheet
                selectedDate={selectedDateForCalendar}
                onSelect={handleDateSelect}
              />
            )}
            {isTimeWheel && (
              <TimeWheelSheet
                selectedTime={selectedTimeForWheel}
                onSelect={handleTimeSelect}
              />
            )}
          </div>,
          document.body,
        )}
    </div>
  );
};
