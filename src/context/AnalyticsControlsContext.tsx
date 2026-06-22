// AnalyticsControlsContext.tsx - Shared analytics date range + history state
// between the top app bar and the analytics screen.
import React, { createContext, useContext } from 'react';
import { useDateRangeFromUrl } from '../hooks/useDateRangeFromUrl';
import { useHistory } from '../hooks/useHistory';
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
}

const AnalyticsControlsContext = createContext<AnalyticsControlsContextValue | null>(null);

interface AnalyticsControlsProviderProps {
  active: boolean;
  children: React.ReactNode;
}

export const AnalyticsControlsProvider: React.FC<AnalyticsControlsProviderProps> = ({
  active,
  children,
}) => {
  const { range, setRange } = useDateRangeFromUrl();
  const { loading, error, refetch, detectionData, turbidityData } = useHistory(range, active);

  return (
    <AnalyticsControlsContext.Provider
      value={{ range, setRange, loading, error, refetch, detectionData, turbidityData }}
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
