// useDateRangeFromUrl.ts - Sync analytics date range with URL query params
import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, isValid, parseISO, startOfDay } from 'date-fns';
import type { DateRange } from '../types/aquarium';
import { todayUTC } from '../utils/formatters';

const URL_START_KEY = 'start';
const URL_END_KEY = 'end';

function parseUrlParam(value: string | null): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

function getDefaultRange(): DateRange {
  const today = todayUTC();
  return {
    startDate: today,
    endDate: today,
    startTime: '00:00',
    endTime: '23:55',
  };
}

function buildRangeFromUrl(searchParams: URLSearchParams): DateRange {
  const startParam = searchParams.get(URL_START_KEY);
  const endParam = searchParams.get(URL_END_KEY);
  const startDate = parseUrlParam(startParam) ?? startOfDay(new Date());
  const endDate = parseUrlParam(endParam) ?? startOfDay(new Date());

  return {
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
    startTime: startParam ? format(startDate, 'HH:mm') : '00:00',
    endTime: endParam ? format(endDate, 'HH:mm') : '23:55',
  };
}

function buildUrlParam(dateString: string, timeString: string): string {
  return `${dateString}T${timeString}`;
}

export interface UseDateRangeFromUrlOptions {
  defaultRange?: DateRange;
}

export interface UseDateRangeViewModelResult {
  range: DateRange;
  setRange: (range: DateRange) => void;
  resetToToday: () => void;
}

export const useDateRangeFromUrl = ({
  defaultRange,
}: UseDateRangeFromUrlOptions = {}): UseDateRangeViewModelResult => {
  const [range, setLocalRange] = useState<DateRange>(() => {
    if (typeof window === 'undefined') return defaultRange ?? getDefaultRange();
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has(URL_START_KEY) || searchParams.has(URL_END_KEY)) {
      return buildRangeFromUrl(searchParams);
    }
    return defaultRange ?? getDefaultRange();
  });

  const updateUrl = useCallback((next: DateRange) => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set(URL_START_KEY, buildUrlParam(next.startDate, next.startTime));
    params.set(URL_END_KEY, buildUrlParam(next.endDate, next.endTime));
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }, []);

  const setRange = useCallback(
    (next: DateRange) => {
      const normalized: DateRange = {
        ...next,
        startDate: next.startDate,
        endDate: next.endDate,
        startTime: next.startTime,
        endTime: next.endTime,
      };
      setLocalRange(normalized);
      updateUrl(normalized);
    },
    [updateUrl],
  );

  const resetToToday = useCallback(() => {
    setRange(getDefaultRange());
  }, [setRange]);

  // Keep local state in sync if the user navigates with back/forward buttons.
  useEffect(() => {
    const handlePopState = () => {
      setLocalRange(buildRangeFromUrl(new URLSearchParams(window.location.search)));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return useMemo(
    () => ({ range, setRange, resetToToday }),
    [range, setRange, resetToToday],
  );
};
