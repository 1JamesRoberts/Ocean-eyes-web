import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTank } from '../useTank';
import { useFish } from '../useFish';
import { useReadings } from '../useReadings';
import { useLiveFeed } from '../useLiveFeed';
import { useNavigation } from '../../context/NavigationContext';
import { analyzeFishTank, type FishTankAnalysis } from '../../models/services/speciesService';
import { selectActiveFeedMetrics } from '../../models/services/inferenceHelpers';
import {
  getSpeciesById,
  getSpeciesColor,
  getSpeciesInitials,
  type SpeciesInfo,
} from '../../data/speciesCatalog';
import type { FishEntry } from '../../types/aquarium';

interface SpeciesDisplay {
  initials: string;
  color: string;
  name: string;
  imagePath: string | undefined;
}

export const useMyFish = (external?: {
  externalShowAddForm?: boolean;
  onExternalToggleAddForm?: () => void;
}) => {
  const navigation = useNavigation();
  const { activeTank, tankId } = useTank();
  const { fishList, addFish, removeFish, updateFishCount } = useFish(tankId);
  const { readings } = useReadings();
  const { liveState, activeFeed } = useLiveFeed(tankId);

  const latestReading = useMemo(() => readings[0], [readings]);

  const { clarity: displayClarity, fishCount: displayFishCount } = useMemo(
    () => selectActiveFeedMetrics(liveState, activeFeed, latestReading),
    [liveState, activeFeed, latestReading]
  );

  const [name, setName] = useState('');
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string | null>(null);
  const [internalShowAddForm, setInternalShowAddForm] = useState(false);
  const showAddForm = external?.externalShowAddForm ?? internalShowAddForm;
  const [activeFishId, setActiveFishId] = useState<string | null>(null);
  const [fishToDelete, setFishToDelete] = useState<string | null>(null);

  const { stats, speciesDistribution }: FishTankAnalysis = useMemo(
    () => analyzeFishTank(fishList),
    [fishList]
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const fishCard = target.closest('[data-fish-card]');
      if (!fishCard) setActiveFishId(null);
    };
    if (activeFishId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [activeFishId]);

  const getSpeciesDisplay = useCallback((fish: FishEntry): SpeciesDisplay => {
    const species = getSpeciesById(fish.speciesId);
    if (species) {
      return {
        initials: species.initials,
        color: species.color,
        name: species.displayName,
        imagePath: species.imagePath,
      };
    }
    return {
      initials: getSpeciesInitials(fish.speciesId),
      color: getSpeciesColor(fish.speciesId),
      name: fish.name,
      imagePath: undefined,
    };
  }, []);

  const onViewAdvanced = useCallback(
    () => navigation.setActiveTab('settings'),
    [navigation]
  );

  const onToggleAddForm = useCallback(() => {
    if (external?.onExternalToggleAddForm) {
      external.onExternalToggleAddForm();
    } else {
      setInternalShowAddForm((prev) => !prev);
    }
  }, [external]);

  const onCloseAddForm = useCallback(() => {
    if (external?.onExternalToggleAddForm) {
      external.onExternalToggleAddForm();
    } else {
      setInternalShowAddForm(false);
    }
    setName('');
    setSelectedSpeciesId(null);
  }, [external]);

  const onSpeciesSelect = useCallback((species: SpeciesInfo | null, customName?: string) => {
    if (species) {
      setSelectedSpeciesId(species.id);
      setName(species.name);
    } else if (customName) {
      setSelectedSpeciesId(null);
      setName(customName);
    }
  }, []);

  const onAdd = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim() || !tankId) return;
      const species = selectedSpeciesId ? getSpeciesById(selectedSpeciesId) : null;
      const imageUrl = species ? species.imagePath : '/species-placeholder.png';
      addFish(name.trim(), imageUrl, 1);
      setName('');
      setSelectedSpeciesId(null);
      if (external?.onExternalToggleAddForm) {
        external.onExternalToggleAddForm();
      } else {
        setInternalShowAddForm(false);
      }
    },
    [name, selectedSpeciesId, tankId, addFish, external]
  );

  const onToggleFish = useCallback((id: string) => {
    setActiveFishId((prev) => (prev === id ? null : id));
  }, []);

  const onIncrementCount = useCallback(
    (id: string, current: number) => updateFishCount(id, current + 1),
    [updateFishCount]
  );

  const onDecrementCount = useCallback(
    (id: string, current: number) => updateFishCount(id, Math.max(1, current - 1)),
    [updateFishCount]
  );

  const onRequestDelete = useCallback((id: string) => setFishToDelete(id), []);
  const onCancelDelete = useCallback(() => setFishToDelete(null), []);
  const onConfirmDelete = useCallback(() => {
    if (fishToDelete) {
      removeFish(fishToDelete);
      setFishToDelete(null);
    }
  }, [fishToDelete, removeFish]);

  return {
    activeTank,
    fishList,
    stats,
    speciesDistribution,
    displayClarity,
    displayFishCount,
    name,
    setName,
    selectedSpeciesId,
    setSelectedSpeciesId,
    showAddForm,
    activeFishId,
    fishToDelete,
    getSpeciesDisplay,
    onToggleAddForm,
    onCloseAddForm,
    onViewAdvanced,
    onSpeciesSelect,
    onAdd,
    onToggleFish,
    onIncrementCount,
    onDecrementCount,
    onUpdateFishCount: updateFishCount,
    onRequestDelete,
    onCancelDelete,
    onConfirmDelete,
  };
};
