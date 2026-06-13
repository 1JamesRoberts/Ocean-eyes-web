/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { LocalStorageStore, subscribeToDb } from '../services/localStorageStore';
import type { TankBrief } from '../types/aquarium';

const LAST_TANK_ID_KEY = 'oceaneyes_last_tank_id';

export const useTank = () => {
  const [tankId, setTankId] = useState<string | null>(() => {
    const lastTankId = localStorage.getItem(LAST_TANK_ID_KEY);
    if (lastTankId) {
      const linked = LocalStorageStore.getLinkedTanks();
      if (linked.includes(lastTankId)) {
        return lastTankId;
      }
    }
    const list = LocalStorageStore.getLinkedTanks();
    return list.length > 0 ? list[0] : null;
  });

  const [linkedTanks, setLinkedTanks] = useState<string[]>(() => LocalStorageStore.getLinkedTanks());
  const [tanks, setTanks] = useState<TankBrief[]>(() => LocalStorageStore.getTanks());

  const activeTank = tanks.find(t => t.id === tankId);

  const syncTanks = () => {
    setTanks(LocalStorageStore.getTanks());
    setLinkedTanks(LocalStorageStore.getLinkedTanks());
  };

  useEffect(() => {
    syncTanks();
    const unsubTanks = subscribeToDb('tanks', syncTanks);
    const unsubLinked = subscribeToDb('user_tanks', syncTanks);
    return () => {
      unsubTanks();
      unsubLinked();
    };
  }, [tankId]);

  useEffect(() => {
    const handleTankSelect = (e: Event) => {
      const customEvent = e as CustomEvent<string | null>;
      setTankId(customEvent.detail);
    };
    window.addEventListener('oceaneyes_tank_select_changed', handleTankSelect);
    return () => window.removeEventListener('oceaneyes_tank_select_changed', handleTankSelect);
  }, []);

  const selectTank = (id: string | null) => {
    if (id) {
      try {
        localStorage.setItem(LAST_TANK_ID_KEY, id);
      } catch {
        // Ignore quota errors for transient last-tank marker.
      }
    } else {
      localStorage.removeItem(LAST_TANK_ID_KEY);
    }
    setTankId(id);
    window.dispatchEvent(new CustomEvent('oceaneyes_tank_select_changed', { detail: id }));
  };

  const linkTank = async (targetId: string): Promise<boolean> => {
    const success = await LocalStorageStore.joinTank(targetId);
    if (success) {
      selectTank(targetId);
    }
    return success;
  };

  const unlinkTank = () => {
    if (tankId) {
      LocalStorageStore.unlinkTank(tankId);
      const remaining = LocalStorageStore.getLinkedTanks();
      const nextId = remaining.length > 0 ? remaining[0] : null;
      selectTank(nextId);
    }
  };

  const createAndLinkTank = async (name: string, cameraSource?: { type: 'mock' | 'webcam'; deviceId?: string }): Promise<string> => {
    const newId = await LocalStorageStore.createTank(name, cameraSource);
    await LocalStorageStore.joinTank(newId);
    selectTank(newId);
    return newId;
  };

  const updateTankName = (name: string) => {
    if (tankId) {
      LocalStorageStore.updateTankName(tankId, name);
    }
  };

  const updateThresholds = (clarityMin: number, fishPct: number) => {
    if (tankId) {
      LocalStorageStore.updateThresholds(tankId, clarityMin, fishPct);
    }
  };

  return {
    tankId,
    linkedTanks,
    tanks,
    activeTank,
    selectTank,
    linkTank,
    unlinkTank,
    createAndLinkTank,
    updateTankName,
    updateThresholds,
  };
};
