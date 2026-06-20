import { useSyncExternalStore } from 'react';
import {
  DEMO_TANK_ID,
  DEMO_TANK,
  getTanks,
  createTank,
  joinTank,
  unlinkTank as unlinkTankFromRepository,
  updateTankName as updateTankNameInRepository,
  updateThresholds as updateThresholdsInRepository,
  getLinkedTanks,
  subscribeTanks,
} from '../models/repositories/tankRepository';
import type { TankBrief } from '../types/aquarium';

const LAST_TANK_ID_KEY = 'oceaneyes_last_tank_id';
const DEFAULT_TANKS: TankBrief[] = [DEMO_TANK];

export const useTankViewModel = () => {
  const tanks = useSyncExternalStore<TankBrief[]>(
    subscribeTanks,
    () => getTanks() ?? DEFAULT_TANKS,
    () => DEFAULT_TANKS
  );

  const activeTank = tanks.find((t) => t.id === DEMO_TANK_ID) ?? DEMO_TANK;
  const linkedTanks = getLinkedTanks();
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
    return joinTank(_targetId);
  };

  const unlinkTank = () => {
    // Single demo tank mode: unlinking is disabled.
    unlinkTankFromRepository(tankId);
  };

  const createAndLinkTank = async (
    name: string,
    cameraSource?: { type: 'mock' | 'webcam'; deviceId?: string }
  ): Promise<string> => {
    // Single demo tank mode: creation is a no-op that returns the demo id.
    return createTank(name, cameraSource);
  };

  const updateTankName = (name: string) => {
    updateTankNameInRepository(DEMO_TANK_ID, name);
  };

  const updateThresholds = (clarityMin: number, fishPct: number) => {
    updateThresholdsInRepository(DEMO_TANK_ID, clarityMin, fishPct);
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
