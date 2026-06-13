/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import {
  LocalStorageStore,
  subscribeToDb,
  DEMO_TANK_ID,
  DEMO_TANK,
} from '../services/localStorageStore';
import type { TankBrief } from '../types/aquarium';

const LAST_TANK_ID_KEY = 'oceaneyes_last_tank_id';

export const useTank = () => {
  // Single demo tank mode: the app always treats DEMO_TANK as the active tank.
  const [tankId, setTankId] = useState<string | null>(() => {
    const lastTankId = localStorage.getItem(LAST_TANK_ID_KEY);
    return lastTankId === DEMO_TANK_ID ? DEMO_TANK_ID : DEMO_TANK_ID;
  });

  const [linkedTanks, setLinkedTanks] = useState<string[]>([DEMO_TANK_ID]);
  const [tanks, setTanks] = useState<TankBrief[]>([DEMO_TANK]);

  const activeTank = DEMO_TANK;

  const syncTanks = () => {
    // Keep the demo tank in sync with persisted renames/threshold updates.
    const persisted = LocalStorageStore.getTanks().find((t) => t.id === DEMO_TANK_ID);
    setTanks([persisted ?? DEMO_TANK]);
    setLinkedTanks([DEMO_TANK_ID]);
  };

  useEffect(() => {
    syncTanks();
    const unsubTanks = subscribeToDb('tanks', syncTanks);
    const unsubLinked = subscribeToDb('user_tanks', syncTanks);
    return () => {
      unsubTanks();
      unsubLinked();
    };
  }, []);

  useEffect(() => {
    const handleTankSelect = (e: Event) => {
      const customEvent = e as CustomEvent<string | null>;
      if (customEvent.detail === DEMO_TANK_ID) {
        setTankId(DEMO_TANK_ID);
      }
    };
    window.addEventListener('oceaneyes_tank_select_changed', handleTankSelect);
    return () => window.removeEventListener('oceaneyes_tank_select_changed', handleTankSelect);
  }, []);

  const selectTank = (id: string | null) => {
    // Only the demo tank can be selected; ignore everything else.
    if (id === DEMO_TANK_ID) {
      try {
        localStorage.setItem(LAST_TANK_ID_KEY, DEMO_TANK_ID);
      } catch {
        // Ignore quota errors for transient last-tank marker.
      }
      setTankId(DEMO_TANK_ID);
      window.dispatchEvent(
        new CustomEvent('oceaneyes_tank_select_changed', { detail: DEMO_TANK_ID })
      );
    }
  };

  const linkTank = async (_targetId: string): Promise<boolean> => {
    // Single demo tank mode: linking additional tanks is disabled.
    return false;
  };

  const unlinkTank = () => {
    // Single demo tank mode: unlinking is disabled.
  };

  const createAndLinkTank = async (
    _name: string,
    _cameraSource?: { type: 'mock' | 'webcam'; deviceId?: string }
  ): Promise<string> => {
    // Single demo tank mode: creation is a no-op that returns the demo id.
    return DEMO_TANK_ID;
  };

  const updateTankName = (name: string) => {
    LocalStorageStore.updateTankName(DEMO_TANK_ID, name);
  };

  const updateThresholds = (clarityMin: number, fishPct: number) => {
    LocalStorageStore.updateThresholds(DEMO_TANK_ID, clarityMin, fishPct);
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
