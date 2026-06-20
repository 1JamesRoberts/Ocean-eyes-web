// storageBase.ts - Shared localStorage primitives and schema migrations
import type {
  FishEntry,
  LiveState,
  ReadingItem,
  TankBrief,
} from '../../types/aquarium';

// ---------------------------------------------------------------------------
// Single demo tank (multi-tank UI is kept as a non-functional mockup)
// ---------------------------------------------------------------------------
export const DEMO_TANK_ID = 'tank-demo';

export const DEMO_TANK: TankBrief = {
  id: DEMO_TANK_ID,
  name: 'Living Room Reef',
  owner_id: 'anon-user-123',
  created_at: new Date().toISOString(),
  thresholds: {
    max_turbidity_fnu: 5.0,
    fish_change_pct: 50.0,
  },
};

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------
export const STORAGE_KEYS = {
  tanks: 'tanks',
  fish: (tankId: string) => `tank_fish_${tankId}`,
  legacyFish: 'tank_fish',
  readings: 'readings',
  alerts: 'alerts',
  liveState: (tankId: string) => `live_state_${tankId}`,
  linkedTanks: 'user_tanks',
  lastTankId: 'oceaneyes_last_tank_id',
  schemaVersion: 'oceaneyes_schema_version',
} as const;

// ---------------------------------------------------------------------------
// Scoped update events
// ---------------------------------------------------------------------------
const DB_UPDATE_EVENT = 'oceaneyes_db_update';

const snapshotCache = new Map<string, unknown>();

export const notifyUpdate = (key: string) => {
  snapshotCache.delete(key);
  window.dispatchEvent(new CustomEvent(DB_UPDATE_EVENT, { detail: { key } }));
};

export const subscribeToDb = (key: string, callback: () => void) => {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<{ key: string }>;
    if (customEvent.detail?.key === key) {
      callback();
    }
  };
  window.addEventListener(DB_UPDATE_EVENT, handler);
  return () => window.removeEventListener(DB_UPDATE_EVENT, handler);
};

export const subscribe = (key: string, callback: () => void) => subscribeToDb(key, callback);

export const getSnapshot = <T>(key: string, fallback: T): T => {
  const cached = snapshotCache.get(key);
  if (cached !== undefined) {
    return cached as T;
  }
  const value = getOrDefault<T>(key, fallback);
  snapshotCache.set(key, value);
  return value;
};

// ---------------------------------------------------------------------------
// Safe storage write helper
// ---------------------------------------------------------------------------
export interface StorageWriteResult {
  success: boolean;
  error?: string;
}

const STORAGE_ERROR_EVENT = 'oceaneyes_storage_error';

const dispatchStorageError = (key: string, error: Error) => {
  window.dispatchEvent(
    new CustomEvent(STORAGE_ERROR_EVENT, {
      detail: { key, message: error.message, code: (error as DOMException).code },
    })
  );
};

export const subscribeToStorageError = (
  callback: (detail: { key: string; message: string; code?: number }) => void
) => {
  const handler = (event: Event) => {
    callback((event as CustomEvent).detail);
  };
  window.addEventListener(STORAGE_ERROR_EVENT, handler);
  return () => window.removeEventListener(STORAGE_ERROR_EVENT, handler);
};

export const safeSetItem = (key: string, value: string): StorageWriteResult => {
  try {
    localStorage.setItem(key, value);
    return { success: true };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    dispatchStorageError(key, err);
    return { success: false, error: err.message };
  }
};

export const getOrDefault = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  if (data === null) {
    return defaultValue;
  }
  try {
    return JSON.parse(data) as T;
  } catch {
    return defaultValue;
  }
};

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
export const getDefaultLiveState = (): LiveState => ({
  is_live: false,
  stream_url: 'webcam:default',
  started_at: null,
  last_ping_at: null,
  current_clarity: 1.2,
  current_fish_count: 0,
  selected_feed_id: 'feed-main',
  feeds: [
    {
      id: 'feed-main',
      name: 'Local Webcam',
      stream_url: 'webcam:default',
      is_live: false,
      started_at: null,
      current_clarity: 1.2,
      current_fish_count: 0,
      mock_image: '',
    },
  ],
});

// ---------------------------------------------------------------------------
// Schema migrations (run once at app bootstrap)
// ---------------------------------------------------------------------------
const CURRENT_SCHEMA_VERSION = 3;

const migrateTanks = (tanks: TankBrief[]): TankBrief[] => {
  return tanks.map((tank) => {
    const legacy = (tank.thresholds as Record<string, unknown>)?.clarity_min;
    if (legacy !== undefined) {
      const rest = { ...(tank.thresholds as Record<string, unknown>) };
      delete rest.clarity_min;
      return {
        ...tank,
        thresholds: {
          ...rest,
          max_turbidity_fnu: legacy,
        },
      } as TankBrief;
    }
    return tank;
  });
};

const migrateLiveState = (state: LiveState): LiveState => {
  const defaultState = getDefaultLiveState();
  if (!state.feeds || !Array.isArray(state.feeds) || state.feeds.length === 0) {
    state.feeds = defaultState.feeds;
  }
  if (state.feeds.length > 1) {
    state.feeds = defaultState.feeds;
  }
  if (!state.selected_feed_id) {
    state.selected_feed_id = defaultState.selected_feed_id;
  }
  const isWebcam = state.feeds[0].stream_url?.startsWith('webcam:');
  if (!isWebcam && state.feeds[0].mock_image !== '/mock_camera_main.png') {
    state.feeds[0].mock_image = '/mock_camera_main.png';
  }
  return state;
};

const migrateCalibrationToFeed = (
  tanks: TankBrief[],
  liveStateGetter: (tankId: string) => LiveState,
  liveStateSetter: (tankId: string, state: LiveState) => void
) => {
  tanks.forEach((tank) => {
    if (!tank.calibration) return;
    const state = liveStateGetter(tank.id);
    const defaultFeed = state.feeds[0];
    if (defaultFeed && !defaultFeed.calibration) {
      defaultFeed.calibration = { water_line_y: tank.calibration.water_line_y };
      liveStateSetter(tank.id, state);
    }
    delete (tank as TankBrief & { calibration?: unknown }).calibration;
  });
};

const migrateGlobalFishToPerTank = (
  tanks: TankBrief[],
  fishSaver: (tankId: string, fish: FishEntry[]) => void
) => {
  const globalFish = getOrDefault<FishEntry[]>(STORAGE_KEYS.legacyFish, []);
  if (globalFish.length === 0) return;

  const defaultTankId = tanks[0]?.id;
  if (!defaultTankId) return;

  const perTank: Record<string, FishEntry[]> = {};
  globalFish.forEach((entry) => {
    const tankId = entry.tankId || defaultTankId;
    if (!perTank[tankId]) perTank[tankId] = [];
    perTank[tankId].push({ ...entry, tankId });
  });

  Object.entries(perTank).forEach(([tankId, fish]) => {
    fishSaver(tankId, fish);
  });

  localStorage.removeItem(STORAGE_KEYS.legacyFish);
};

const migrateToSingleDemoTank = (): void => {
  const previousLinked = getOrDefault<string[]>(STORAGE_KEYS.linkedTanks, []);
  const previousLastTankId = localStorage.getItem(STORAGE_KEYS.lastTankId);

  // Merge fish from all previously linked tanks into the demo tank.
  const mergedFish: FishEntry[] = [];
  previousLinked.forEach((tankId) => {
    const fish = getOrDefault<FishEntry[]>(STORAGE_KEYS.fish(tankId), []);
    fish.forEach((entry) => mergedFish.push({ ...entry, tankId: DEMO_TANK_ID }));
    localStorage.removeItem(STORAGE_KEYS.fish(tankId));
  });
  const globalFish = getOrDefault<FishEntry[]>(STORAGE_KEYS.legacyFish, []);
  globalFish.forEach((entry) => mergedFish.push({ ...entry, tankId: DEMO_TANK_ID }));
  localStorage.removeItem(STORAGE_KEYS.legacyFish);

  // Deduplicate by species id and sum counts.
  const fishBySpecies: Record<string, FishEntry> = {};
  mergedFish.forEach((entry) => {
    const existing = fishBySpecies[entry.speciesId];
    if (existing) {
      existing.count += entry.count;
      existing.detected = Math.max(existing.detected, entry.detected);
    } else {
      fishBySpecies[entry.speciesId] = { ...entry };
    }
  });
  safeSetItem(STORAGE_KEYS.fish(DEMO_TANK_ID), JSON.stringify(Object.values(fishBySpecies)));

  // Re-tag readings to the demo tank and keep the most recent ones.
  const readings = getOrDefault<ReadingItem[]>(STORAGE_KEYS.readings, []);
  if (readings.length > 0) {
    const retagged = readings.map((r) => ({ ...r, tank_id: DEMO_TANK_ID }));
    safeSetItem(STORAGE_KEYS.readings, JSON.stringify(retagged.slice(0, 50)));
  }

  // Migrate the most recent live state, forcing a webcam-only feed.
  const sourceTankId =
    previousLastTankId && previousLinked.includes(previousLastTankId)
      ? previousLastTankId
      : previousLinked[0];
  let liveState = getOrDefault<LiveState>(
    STORAGE_KEYS.liveState(sourceTankId || DEMO_TANK_ID),
    getDefaultLiveState()
  );
  liveState = migrateLiveState(liveState);
  liveState.stream_url = 'webcam:default';
  liveState.feeds = liveState.feeds.slice(0, 1).map((feed) => ({
    ...feed,
    name: 'Local Webcam',
    stream_url: 'webcam:default',
    mock_image: '',
  }));
  safeSetItem(STORAGE_KEYS.liveState(DEMO_TANK_ID), JSON.stringify(liveState));

  // Delete any old per-tank live state keys.
  previousLinked.forEach((tankId) => {
    localStorage.removeItem(STORAGE_KEYS.liveState(tankId));
  });

  // Reset tanks and linked list to the single demo tank.
  safeSetItem(STORAGE_KEYS.tanks, JSON.stringify([DEMO_TANK]));
  safeSetItem(STORAGE_KEYS.linkedTanks, JSON.stringify([DEMO_TANK_ID]));
  safeSetItem(STORAGE_KEYS.lastTankId, DEMO_TANK_ID);
  notifyUpdate(STORAGE_KEYS.tanks);
  notifyUpdate(STORAGE_KEYS.linkedTanks);
};

export const migrateLocalStorage = (): void => {
  const currentVersion = getOrDefault<number>(STORAGE_KEYS.schemaVersion, 0);
  if (currentVersion >= CURRENT_SCHEMA_VERSION) return;

  // v1: migrate tank thresholds and live-state shape
  if (currentVersion < 1) {
    const tanks = getOrDefault<TankBrief[]>(STORAGE_KEYS.tanks, []);
    safeSetItem(STORAGE_KEYS.tanks, JSON.stringify(migrateTanks(tanks)));

    const linkedTanks = getOrDefault<string[]>(STORAGE_KEYS.linkedTanks, []);
    linkedTanks.forEach((tankId) => {
      const key = STORAGE_KEYS.liveState(tankId);
      const state = getOrDefault<LiveState>(key, getDefaultLiveState());
      safeSetItem(key, JSON.stringify(migrateLiveState(state)));
    });
  }

  // v2: per-tank fish ownership + feed-level calibration
  if (currentVersion < 2) {
    const tanks = getOrDefault<TankBrief[]>(STORAGE_KEYS.tanks, []);

    migrateCalibrationToFeed(
      tanks,
      (id) => getOrDefault<LiveState>(STORAGE_KEYS.liveState(id), getDefaultLiveState()),
      (id, state) => safeSetItem(STORAGE_KEYS.liveState(id), JSON.stringify(state))
    );
    safeSetItem(STORAGE_KEYS.tanks, JSON.stringify(tanks));

    migrateGlobalFishToPerTank(tanks, (tankId, fish) =>
      safeSetItem(STORAGE_KEYS.fish(tankId), JSON.stringify(fish))
    );
  }

  // v3: collapse multi-tank data into a single demo tank and force webcam feed.
  if (currentVersion < 3) {
    migrateToSingleDemoTank();
  }

  safeSetItem(STORAGE_KEYS.schemaVersion, JSON.stringify(CURRENT_SCHEMA_VERSION));
};
