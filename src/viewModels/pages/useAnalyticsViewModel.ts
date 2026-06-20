import { useState, useMemo, useCallback } from 'react';
import { useTankViewModel } from '../useTankViewModel';
import { useReadingsViewModel } from '../useReadingsViewModel';
import { useFishViewModel } from '../useFishViewModel';
import { useDateRangeViewModel } from '../useDateRangeViewModel';
import { useHistoryViewModel } from '../useHistoryViewModel';
import { useNavigationViewModel } from '../useNavigationViewModel';
import {
  resolveCropUrl,
  clearDetectionHistoryRange,
  clearTurbidityHistoryRange,
} from '../../models/api/aiApi';
import { selectDiagnoses, selectSpeciesList } from '../../models/services/historyAnalytics';
import type { DateRange } from '../../types/aquarium';

export const useAnalyticsViewModel = () => {
  const navigation = useNavigationViewModel();
  const { tankId } = useTankViewModel();
  const { readings } = useReadingsViewModel();
  const { fishList } = useFishViewModel(tankId);
  const { range, setRange } = useDateRangeViewModel();
  const { detectionData, turbidityData, loading, error, refetch } = useHistoryViewModel(range);

  const detectionRecords = useMemo(() => detectionData?.records ?? [], [detectionData]);
  const turbidityRecords = useMemo(() => turbidityData?.records ?? [], [turbidityData]);

  const diagnoses = useMemo(
    () => selectDiagnoses(detectionRecords),
    [detectionRecords]
  );
  const speciesList = useMemo(
    () => selectSpeciesList(detectionRecords, fishList),
    [detectionRecords, fishList]
  );

  const inventorySpeciesIds = useMemo(
    () => new Set(fishList.map((f) => f.speciesId)),
    [fishList]
  );

  const hasAnyData = useMemo(
    () => detectionRecords.length > 0 || turbidityRecords.length > 0 || readings.length > 0,
    [detectionRecords, turbidityRecords, readings]
  );

  const [selectedSpecies, setSelectedSpecies] = useState<string>('all');
  const [confirmClear, setConfirmClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const onRangeChange = useCallback(
    (next: DateRange) => setRange(next),
    [setRange]
  );

  const onRefetch = useCallback(() => refetch(), [refetch]);

  const onStartClear = useCallback(() => setConfirmClear(true), []);
  const onCancelClear = useCallback(() => setConfirmClear(false), []);

  const onConfirmClear = useCallback(async () => {
    setIsClearing(true);
    try {
      await Promise.all([
        clearDetectionHistoryRange(range.startDate, range.endDate),
        clearTurbidityHistoryRange(range.startDate, range.endDate),
      ]);
      setConfirmClear(false);
      refetch();
    } catch (err) {
      console.error('Failed to clear history:', err);
    } finally {
      setIsClearing(false);
    }
  }, [range, refetch]);

  const onViewHistory = useCallback(
    () => navigation.setActiveTab('history'),
    [navigation]
  );

  return {
    tankId,
    range,
    setRange: onRangeChange,
    readings,
    detectionRecords,
    turbidityRecords,
    diagnoses,
    speciesList,
    inventorySpeciesIds,
    selectedSpecies,
    setSelectedSpecies,
    hasAnyData,
    loading,
    error,
    refetch: onRefetch,
    confirmClear,
    isClearing,
    onStartClear,
    onCancelClear,
    onConfirmClear,
    onViewHistory,
    resolveCropUrl,
  };
};
