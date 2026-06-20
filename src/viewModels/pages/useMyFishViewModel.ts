import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTankViewModel } from '../useTankViewModel';
import { useFishViewModel } from '../useFishViewModel';
import { analyzeFishTank, type FishTankAnalysis } from '../../models/services/speciesService';
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

export const useMyFishViewModel = () => {
  const { tankId } = useTankViewModel();
  const { fishList, addFish, removeFish, updateFishCount } = useFishViewModel(tankId);

  const [name, setName] = useState('');
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
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

  const onToggleAddForm = useCallback(() => setShowAddForm((prev) => !prev), []);

  const onCloseAddForm = useCallback(() => {
    setShowAddForm(false);
    setName('');
    setSelectedSpeciesId(null);
  }, []);

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
      setShowAddForm(false);
    },
    [name, selectedSpeciesId, tankId, addFish]
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
    fishList,
    stats,
    speciesDistribution,
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
