import { useSyncExternalStore } from 'react';
import {
  LocalStorageStore,
  subscribe,
  DEMO_TANK_ID,
  DEMO_TANK,
} from '../services/localStorageStore';
import type { TankBrief } from '../types/aquarium';

const LAST_TANK_ID_KEY = 'oceaneyes_last_tank_id';
const DEFAULT_TANKS: TankBrief[] = [DEMO_TANK];

const subscribeTanks = (callback: () => void) => subscribe('tanks', callback);

export const useTank = () => {
  const tanks = useSyncExternalStore<TankBrief[]>(
    subscribeTanks,
    () => LocalStorageStore.getSnapshot('tanks', DEFAULT_TANKS),
    () => DEFAULT_TANKS
  );

  const activeTank = tanks.find((t) => t.id === DEMO_TANK_ID) ?? DEMO_TANK;
  const linkedTanks = [DEMO_TANK_ID];
  const tankId = DEMO_TANK_ID;

  const selectTank = (id: string | null) => {
    // Only the demo tank can be selected; ignore everything else.
    if (id === DEMO_TANK_ID) {
      try {
        localStorage.setItem(LAST_TANK_ID_KEY, DEMO_TANK_ID);
      } catch {
        // Ignore quota errors for transient last-tank marker.
      }
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
