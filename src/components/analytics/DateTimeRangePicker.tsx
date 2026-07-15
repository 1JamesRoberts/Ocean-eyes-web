// DateTimeRangePicker.tsx - Apple-style Starts/Ends date-time range selector
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, History } from 'lucide-react';
import type { DateRange } from '../../types/aquarium';
import {
  formatDateForDisplay,
  formatTimeForDisplay,
  toISODate,
} from '../../utils/formatters';
import { parseUTCDate } from '../../utils/dateUtc';
import { CalendarSheet } from './CalendarSheet';
import { DateTimePill } from './DateTimePill';
import { TimeWheelSheet } from './TimeWheelSheet';

type ActiveField = 'startDate' | 'startTime' | 'endDate' | 'endTime' | null;

const POPOVER_EDGE_GUTTER = 16;
const POPOVER_MAX_WIDTH = 320;

interface DateTimeRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  /** Start as a calendar-only control and reveal the range on activation. */
  collapseToIcon?: boolean;
  /** Match controls rendered over the shared hero video. */
  heroOverlay?: boolean;
}

interface OpenState {
  field: ActiveField;
}

export const DateTimeRangePicker: React.FC<DateTimeRangePickerProps> = ({
  value,
  onChange,
  collapseToIcon = false,
  heroOverlay = false,
}) => {
  const [open, setOpen] = useState<OpenState | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
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
    return parseUTCDate(dateStr);
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

  const isCalendar = activeField === 'startDate' || activeField === 'endDate';
  const isTimeWheel = activeField === 'startTime' || activeField === 'endTime';

  const popoverStyle = useMemo<React.CSSProperties>(() => {
    if (!open) return {};
    const width = Math.min(
      POPOVER_MAX_WIDTH,
      window.innerWidth - POPOVER_EDGE_GUTTER * 2,
    );

    if (isCalendar || isTimeWheel) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        width,
        maxHeight: 'calc(100dvh - 32px)',
        overflowY: 'auto',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
      };
    }
    return {};
  }, [isCalendar, isTimeWheel, open]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !containerRef.current?.contains(target) &&
        !editorRef.current?.contains(target) &&
        !popoverRef.current?.contains(target)
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
      () => {
        setOpen((prev) =>
          prev?.field === field
            ? null
            : { field },
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

  const toggleExpanded = useCallback(() => {
    setIsExpanded((previous) => !previous);
  }, []);

  const showSummary = !collapseToIcon;

  const editorStyle = useMemo<React.CSSProperties>(() => {
    const trigger = triggerRef.current;
    if (!trigger) return { visibility: 'hidden' };

    const rect = trigger.getBoundingClientRect();
    const width = collapseToIcon
      ? Math.min(288, window.innerWidth - 32)
      : rect.width;

    return {
      position: 'fixed',
      top: rect.bottom + 8,
      left: Math.max(16, Math.min(rect.right - width, window.innerWidth - width - 16)),
      width,
      zIndex: 1000,
      maxHeight: isExpanded ? 200 : 0,
      opacity: isExpanded ? 1 : 0,
      pointerEvents: isExpanded ? 'auto' : 'none',
    };
  }, [collapseToIcon, isExpanded]);

  return (
    <div
      ref={containerRef}
      className={`relative transition-[width] duration-300 ease-in-out ${
        collapseToIcon
          ? 'w-auto'
          : ''
      }`}
    >
      {/* Compact header control keeps its footprint while toggling the range editor. */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleExpanded}
        aria-expanded={isExpanded}
        aria-controls="date-range-editor"
        aria-label={showSummary ? 'Edit date range' : isExpanded ? 'Collapse date range' : 'Expand date range'}
        className={heroOverlay
          ? 'hero-overlay-pill w-full cursor-pointer'
          : `
            flex w-full cursor-pointer items-center justify-center rounded-full
            border-0 bg-white/30 type-body whitespace-nowrap backdrop-blur-[6px]
            transition-colors hover:bg-white/50
            ${showSummary ? 'gap-2 px-4 py-2.5' : 'min-h-11 gap-1.5 px-3 py-1.5 type-caption'}
          `}
        style={{
          boxShadow: heroOverlay
            ? undefined
            : 'var(--shadow-glass), 0 4px 20px 0 rgba(0, 67, 73, 0.05)',
        }}
        onMouseEnter={(e) => {
          if (heroOverlay) return;
          e.currentTarget.style.boxShadow =
            'var(--shadow-glass), 0 6px 24px 0 rgba(0, 67, 73, 0.08)';
        }}
        onMouseLeave={(e) => {
          if (heroOverlay) return;
          e.currentTarget.style.boxShadow =
            'var(--shadow-glass), 0 4px 20px 0 rgba(0, 67, 73, 0.05)';
        }}
      >
        <History size={16} className={heroOverlay ? 'text-white/70' : 'text-text-muted'} />
        {showSummary ? (
          <>
            <span className="min-w-0 truncate">{summaryText}</span>
            <ChevronDown
              size={18}
              className={`
                shrink-0 transition-transform duration-300 ease-in-out
                ${heroOverlay ? 'text-white/70' : 'text-text-muted'}
                ${isExpanded ? 'rotate-180' : ''}
              `}
            />
          </>
        ) : (
          <span className="font-semibold">Range</span>
        )}
      </button>

      {/* Collapsible Starts / Ends rows — slides out below without shifting layout */}
      {createPortal(<div
        ref={editorRef}
        id="date-range-editor"
        className="overflow-hidden glass-card-overlay p-3 pb-2 text-white transition-all duration-300 ease-in-out"
        style={editorStyle}
        aria-label="Date range editor"
      >
        <div className="flex flex-col gap-2">
          {/* Starts row */}
          <div className="flex items-center gap-2">
            <span className="w-14 type-strong-inverse">Starts</span>
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
            <span className="w-14 type-strong-inverse">Ends</span>
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
      </div>, document.body)}

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className="animate-fade-in glass-card-overlay text-text"
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
