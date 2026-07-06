// AnalyticsControlsContext.tsx - Shared analytics date range + history state
// between the top app bar and the analytics screen.
import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { useDateRangeFromUrl } from '../hooks/useDateRangeFromUrl';
import { useHistory } from '../hooks/useHistory';
import { useLatestDetectionDate } from '../hooks/useLatestDetectionDate';
import type {
  DateRange,
  HistoryDetectionResponse,
  HistoryTurbidityResponse,
} from '../types/aquarium';

interface AnalyticsControlsContextValue {
  range: DateRange;
  setRange: (range: DateRange) => void;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  detectionData: HistoryDetectionResponse | null;
  turbidityData: HistoryTurbidityResponse | null;
  isFallback: boolean;
}

const AnalyticsControlsContext = createContext<AnalyticsControlsContextValue | null>(null);

interface AnalyticsControlsProviderProps {
  active: boolean;
  children: React.ReactNode;
}

function hasUrlRangeParams(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.has('start') || params.has('end');
}

function buildRangeForDate(date: string): DateRange {
  return {
    startDate: date,
    endDate: date,
    startTime: '00:00',
    endTime: '23:55',
  };
}

export const AnalyticsControlsProvider: React.FC<AnalyticsControlsProviderProps> = ({
  active,
  children,
}) => {
  const { latestDate, loading: latestDateLoading, error: latestDateError, isFallback: latestDateIsFallback } = useLatestDetectionDate(true);
  const hasUrlParams = hasUrlRangeParams();
  const initialDateRef = useRef<string | null>(null);

  const defaultRange = useMemo<DateRange | undefined>(() => {
    if (!active) return undefined;
    if (hasUrlParams) return undefined;
    if (latestDate) {
      return buildRangeForDate(latestDate);
    }
    return undefined;
  }, [active, hasUrlParams, latestDate]);

  const { range, setRange } = useDateRangeFromUrl({ defaultRange });

  useEffect(() => {
    if (!latestDate || hasUrlParams) return;
    if (initialDateRef.current === null) {
      initialDateRef.current = latestDate;
      setRange(buildRangeForDate(latestDate));
    }
  }, [latestDate, hasUrlParams, setRange]);

  const {
    loading,
    error,
    refetch,
    detectionData,
    turbidityData,
    isFallback: historyIsFallback,
  } = useHistory(range, active && !latestDateLoading);

  useEffect(() => {
    if (!active || !latestDate || hasUrlParams) return;
    if (latestDateLoading || loading) return;
    const hasDetection = (detectionData?.records ?? []).length > 0;
    const hasTurbidity = (turbidityData?.records ?? []).length > 0;
    if (hasDetection || hasTurbidity) return;
    if (range.startDate === latestDate && range.endDate === latestDate) return;
    setRange(buildRangeForDate(latestDate));
  }, [active, latestDate, hasUrlParams, latestDateLoading, loading, detectionData, turbidityData, range, setRange]);

  const combinedLoading = loading || latestDateLoading;
  const isFallback = latestDateIsFallback || historyIsFallback;
  const combinedError = isFallback ? null : error || latestDateError;

  return (
    <AnalyticsControlsContext.Provider
      value={{ range, setRange, loading: combinedLoading, error: combinedError, refetch, detectionData, turbidityData, isFallback }}
    >
      {children}
    </AnalyticsControlsContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAnalyticsControls = (): AnalyticsControlsContextValue => {
  const ctx = useContext(AnalyticsControlsContext);
  if (!ctx) {
    throw new Error('useAnalyticsControls must be used within AnalyticsControlsProvider');
  }
  return ctx;
};
