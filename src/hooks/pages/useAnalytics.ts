import { useState, useMemo, useCallback } from 'react';
import { useTank } from '../useTank';
import { useReadings } from '../useReadings';
import { useFish } from '../useFish';
import { useLiveFeed } from '../useLiveFeed';
import { useAnalyticsControls } from '../../context/AnalyticsControlsContext';
import { useNavigation } from '../../context/NavigationContext';
import { resolveCropUrl } from '../../models/api/aiApi';
import {
  selectDiagnoses,
  selectHeatmapRecords,
  selectSpeciesList,
} from '../../models/services/historyAnalytics';
import type { DateRange } from '../../types/aquarium';

export const useAnalytics = () => {
  const navigation = useNavigation();
  const { tankId } = useTank();
  const { readings } = useReadings();
  const { fishList } = useFish(tankId);
  const { liveState } = useLiveFeed();
  const {
    range,
    setRange,
    loading,
    isInitialLoading,
    isRefreshing,
    error,
    refetch,
    detectionData,
    turbidityData,
    isFallback,
  } = useAnalyticsControls();

  const detectionRecords = useMemo(() => detectionData?.records ?? [], [detectionData]);
  const turbidityRecords = useMemo(() => turbidityData?.records ?? [], [turbidityData]);
  const heatmapRecords = useMemo(
    () => selectHeatmapRecords(detectionRecords, liveState?.last_prediction, range),
    [detectionRecords, liveState?.last_prediction, range],
  );

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

  const onRangeChange = useCallback(
    (next: DateRange) => setRange(next),
    [setRange]
  );

  const onRefetch = useCallback(() => refetch(), [refetch]);

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
    heatmapRecords,
    turbidityRecords,
    diagnoses,
    speciesList,
    inventorySpeciesIds,
    selectedSpecies,
    setSelectedSpecies,
    hasAnyData,
    loading,
    isInitialLoading,
    isRefreshing,
    error,
    refetch: onRefetch,
    onViewHistory,
    resolveCropUrl,
    isFallback,
  };
};
