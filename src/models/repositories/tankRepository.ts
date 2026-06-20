// tankRepository.ts - Tank CRUD and linked-tank helpers
import type { TankBrief } from '../../types/aquarium';
import {
  DEMO_TANK_ID,
  DEMO_TANK,
  STORAGE_KEYS,
  getOrDefault,
  safeSetItem,
  notifyUpdate,
  subscribeToDb,
} from './storageBase';

export { DEMO_TANK_ID, DEMO_TANK };

export const getTanks = (): TankBrief[] => {
  return getOrDefault<TankBrief[]>(STORAGE_KEYS.tanks, []);
};

export const saveTanks = (tanks: TankBrief[]) => {
  const result = safeSetItem(STORAGE_KEYS.tanks, JSON.stringify(tanks));
  if (result.success) notifyUpdate(STORAGE_KEYS.tanks);
  return result;
};

export const updateTankName = (tankId: string, name: string) => {
  const tanks = getTanks();
  const index = tanks.findIndex((t) => t.id === tankId);
  if (index !== -1) {
    tanks[index].name = name;
    saveTanks(tanks);
  }
};

export const updateThresholds = (
  tankId: string,
  maxTurbidityFnu: number,
  fishPct: number
) => {
  const tanks = getTanks();
  const index = tanks.findIndex((t) => t.id === tankId);
  if (index !== -1) {
    tanks[index].thresholds = {
      max_turbidity_fnu: maxTurbidityFnu,
      fish_change_pct: fishPct,
    };
    saveTanks(tanks);
  }
};

export async function createTank(
  _name: string,
  _cameraSource?: { type: 'mock' | 'webcam'; deviceId?: string }
): Promise<string> {
  // Single demo tank mode: creation is a no-op that returns the demo id.
  return DEMO_TANK_ID;
}

export async function joinTank(_tankId: string): Promise<boolean> {
  // Single demo tank mode: linking additional tanks is disabled.
  return false;
}

export const getLinkedTanks = (): string[] => {
  return [DEMO_TANK_ID];
};

export const unlinkTank = (_tankId: string) => {
  // Single demo tank mode: unlinking is disabled.
};

export const subscribeTanks = (callback: () => void) =>
  subscribeToDb(STORAGE_KEYS.tanks, callback);
