import { useState, useRef, useCallback } from 'react';
import { useTank } from '../useTank';
import { useLivePreferences } from '../useLivePreferences';
import { useNavigation } from '../../context/NavigationContext';
import type { AIPreferences } from '../../types/aquarium';

export const useSettings = () => {
  const navigation = useNavigation();
  const { activeTank, unlinkTank, updateTankName, updateThresholds } = useTank();

  const [name, setName] = useState(() => activeTank?.name || 'Living Room Reef');
  const [editing, setEditing] = useState(false);
  const [showConfirmUnlink, setShowConfirmUnlink] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const maxTurbidity = activeTank?.thresholds.max_turbidity_fnu ?? 6.0;
  const fishChangePct = activeTank?.thresholds.fish_change_pct ?? 50.0;

  const {
    preferences,
    updateAIPreferences,
    updateAutoConnect,
  } = useLivePreferences(activeTank?.id ?? null);

  const debouncedUpdateThresholds = useCallback(
    (clarityMin: number, fishPct: number) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        updateThresholds(clarityMin, fishPct);
      }, 300);
    },
    [updateThresholds]
  );

  const flushThresholds = useCallback(
    (clarityMin: number, fishPct: number) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
      updateThresholds(clarityMin, fishPct);
    },
    [updateThresholds]
  );

  const flushAIPreferences = useCallback(
    (next: AIPreferences) => {
      if (aiDebounceTimer.current) clearTimeout(aiDebounceTimer.current);
      aiDebounceTimer.current = null;
      updateAIPreferences(next);
    },
    [updateAIPreferences]
  );

  const debouncedUpdateAIPreferences = useCallback(
    (next: AIPreferences) => {
      if (aiDebounceTimer.current) clearTimeout(aiDebounceTimer.current);
      aiDebounceTimer.current = setTimeout(() => {
        updateAIPreferences(next);
      }, 300);
    },
    [updateAIPreferences]
  );

  const handleNameChange = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;
      updateTankName(name.trim());
      setEditing(false);
    },
    [name, updateTankName]
  );

  const onTurbidityChange = useCallback(
    (value: number) => debouncedUpdateThresholds(value, fishChangePct),
    [debouncedUpdateThresholds, fishChangePct]
  );

  const onTurbidityCommit = useCallback(
    (value: number) => flushThresholds(value, fishChangePct),
    [flushThresholds, fishChangePct]
  );

  const onFishPctChange = useCallback(
    (value: number) => debouncedUpdateThresholds(maxTurbidity, value),
    [debouncedUpdateThresholds, maxTurbidity]
  );

  const onFishPctCommit = useCallback(
    (value: number) => flushThresholds(maxTurbidity, value),
    [flushThresholds, maxTurbidity]
  );

  const onStartRename = useCallback(() => setEditing(true), []);
  const onRequestUnlink = useCallback(() => setShowConfirmUnlink(true), []);
  const onCancelUnlink = useCallback(() => setShowConfirmUnlink(false), []);
  const onConfirmUnlink = useCallback(() => {
    unlinkTank();
    setShowConfirmUnlink(false);
  }, [unlinkTank]);

  const onAIPreferenceChange = useCallback(
    (patch: Partial<AIPreferences>) => {
      const next = { ...preferences.ai, ...patch };
      debouncedUpdateAIPreferences(next);
    },
    [preferences.ai, debouncedUpdateAIPreferences]
  );

  const onAIPreferenceCommit = useCallback(
    (patch: Partial<AIPreferences>) => {
      const next = { ...preferences.ai, ...patch };
      flushAIPreferences(next);
    },
    [preferences.ai, flushAIPreferences]
  );

  const onAutoConnectChange = useCallback(
    (autoConnect: boolean) => updateAutoConnect(autoConnect),
    [updateAutoConnect]
  );

  const onNavigateToAlerts = useCallback(
    () => navigation.setActiveTab('alerts'),
    [navigation]
  );

  return {
    activeTank,
    name,
    setName,
    editing,
    showConfirmUnlink,
    maxTurbidity,
    fishChangePct,
    handleNameChange,
    onStartRename,
    onTurbidityChange,
    onTurbidityCommit,
    onFishPctChange,
    onFishPctCommit,
    onRequestUnlink,
    onCancelUnlink,
    onConfirmUnlink,
    onAIPreferenceChange,
    onAIPreferenceCommit,
    onAutoConnectChange,
    preferences,
    onNavigateToAlerts,
  };
};
