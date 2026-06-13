// localStorageStore.ts - Primary localStorage data layer for OceanEyes
import type {
  FishEntry,
  AlertItem,
  ReadingItem,
  LiveState,
  TankBrief,
} from '../types/aquarium';

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------
const STORAGE_KEYS = {
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

const notifyUpdate = (key: string) => {
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

const safeSetItem = (key: string, value: string): StorageWriteResult => {
  try {
    localStorage.setItem(key, value);
    return { success: true };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    dispatchStorageError(key, err);
    return { success: false, error: err.message };
  }
};

const getOrDefault = <T>(key: string, defaultValue: T): T => {
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
// Schema migrations (run once at app bootstrap)
// ---------------------------------------------------------------------------
const CURRENT_SCHEMA_VERSION = 2;

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

  safeSetItem(STORAGE_KEYS.schemaVersion, JSON.stringify(CURRENT_SCHEMA_VERSION));
};

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
const getDefaultLiveState = (): LiveState => ({
  is_live: false,
  stream_url: 'rtsp://oceaneyes.iot/live-stream-09',
  started_at: null,
  last_ping_at: null,
  current_clarity: 1.2,
  current_fish_count: 0,
  selected_feed_id: 'feed-main',
  feeds: [
    {
      id: 'feed-main',
      name: 'Main View',
      stream_url: 'rtsp://oceaneyes.iot/live-stream-09',
      is_live: false,
      started_at: null,
      current_clarity: 1.2,
      current_fish_count: 0,
      mock_image: '/mock_camera_main.png',
    },
  ],
});

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export class LocalStorageStore {
  // ─── Tanks ─────────────────────────────────────────────────────────────────
  static getTanks = (): TankBrief[] => {
    return getOrDefault<TankBrief[]>(STORAGE_KEYS.tanks, []);
  };

  static saveTanks = (tanks: TankBrief[]) => {
    const result = safeSetItem(STORAGE_KEYS.tanks, JSON.stringify(tanks));
    if (result.success) notifyUpdate(STORAGE_KEYS.tanks);
    return result;
  };

  // ─── Fish (per-tank) ───────────────────────────────────────────────────────
  static getFish = (tankId: string): FishEntry[] =>
    getOrDefault<FishEntry[]>(STORAGE_KEYS.fish(tankId), []);

  static saveFish = (tankId: string, fish: FishEntry[]) => {
    const key = STORAGE_KEYS.fish(tankId);
    const result = safeSetItem(key, JSON.stringify(fish));
    if (result.success) notifyUpdate(key);
    return result;
  };

  // ─── Readings ──────────────────────────────────────────────────────────────
  static getReadings = (): ReadingItem[] =>
    getOrDefault<ReadingItem[]>(STORAGE_KEYS.readings, []);

  static saveReadings = (readings: ReadingItem[]) => {
    const result = safeSetItem(STORAGE_KEYS.readings, JSON.stringify(readings));
    if (result.success) notifyUpdate(STORAGE_KEYS.readings);
    return result;
  };

  // ─── Alerts ────────────────────────────────────────────────────────────────
  static getAlerts = (): AlertItem[] =>
    getOrDefault<AlertItem[]>(STORAGE_KEYS.alerts, []);

  static saveAlerts = (alerts: AlertItem[]) => {
    const result = safeSetItem(STORAGE_KEYS.alerts, JSON.stringify(alerts));
    if (result.success) notifyUpdate(STORAGE_KEYS.alerts);
    return result;
  };

  // ─── Live State (per-tank) ─────────────────────────────────────────────────
  static getLiveState = (tankId: string): LiveState => {
    const key = STORAGE_KEYS.liveState(tankId);
    return getOrDefault<LiveState>(key, getDefaultLiveState());
  };

  static saveLiveState = (tankId: string, state: LiveState) => {
    const key = STORAGE_KEYS.liveState(tankId);
    const result = safeSetItem(key, JSON.stringify(state));
    if (result.success) notifyUpdate(key);
    return result;
  };

  static switchActiveFeed = (tankId: string, feedId: string) => {
    const liveState = this.getLiveState(tankId);
    const activeFeed = liveState.feeds.find((f) => f.id === feedId);
    if (activeFeed) {
      liveState.selected_feed_id = feedId;
      liveState.stream_url = activeFeed.stream_url;
      liveState.current_clarity = activeFeed.current_clarity;
      liveState.current_fish_count = activeFeed.current_fish_count;
      liveState.started_at = activeFeed.started_at;
      this.saveLiveState(tankId, liveState);
    }
  };

  // ─── Tank Operations ───────────────────────────────────────────────────────

  static async createTank(
    name: string,
    cameraSource?: { type: 'mock' | 'webcam'; deviceId?: string }
  ): Promise<string> {
    const id = `tank-${Math.floor(Math.random() * 900000) + 100000}`;
    const tanks = this.getTanks();
    const newTank: TankBrief = {
      id,
      name,
      owner_id: 'anon-user-123',
      created_at: new Date().toISOString(),
      thresholds: { max_turbidity_fnu: 5.0, fish_change_pct: 50.0 },
    };
    tanks.push(newTank);
    this.saveTanks(tanks);

    const isWebcam = cameraSource?.type === 'webcam';
    const liveState: LiveState = {
      is_live: false,
      stream_url: isWebcam
        ? `webcam:${cameraSource?.deviceId || 'default'}`
        : 'rtsp://oceaneyes.iot/live-stream-09',
      started_at: null,
      last_ping_at: null,
      current_clarity: 1.2,
      current_fish_count: 0,
      selected_feed_id: 'feed-main',
      feeds: [
        {
          id: 'feed-main',
          name: isWebcam ? 'Local Webcam' : 'Main View',
          stream_url: isWebcam
            ? `webcam:${cameraSource?.deviceId || 'default'}`
            : 'rtsp://oceaneyes.iot/live-stream-09',
          is_live: false,
          started_at: null,
          current_clarity: 1.2,
          current_fish_count: 0,
          mock_image: isWebcam ? '' : '/mock_camera_main.png',
        },
      ],
    };
    this.saveLiveState(id, liveState);

    await this.writeReading({
      tankId: id,
      clarity: 8.0,
      fishCount: 0,
    });

    return id;
  }

  static async joinTank(tankId: string): Promise<boolean> {
    const tanks = this.getTanks();
    const found = tanks.find((t) => t.id === tankId);
    if (!found) return false;

    const userTanks = getOrDefault<string[]>(STORAGE_KEYS.linkedTanks, []);
    if (!userTanks.includes(tankId)) {
      userTanks.push(tankId);
      safeSetItem(STORAGE_KEYS.linkedTanks, JSON.stringify(userTanks));
    }
    notifyUpdate(STORAGE_KEYS.linkedTanks);
    return true;
  }

  static getLinkedTanks(): string[] {
    return getOrDefault<string[]>(STORAGE_KEYS.linkedTanks, []);
  }

  static unlinkTank(tankId: string) {
    const userTanks = this.getLinkedTanks();
    const updated = userTanks.filter((id) => id !== tankId);
    safeSetItem(STORAGE_KEYS.linkedTanks, JSON.stringify(updated));
    notifyUpdate(STORAGE_KEYS.linkedTanks);
  }

  static updateTankName(tankId: string, name: string) {
    const tanks = this.getTanks();
    const index = tanks.findIndex((t) => t.id === tankId);
    if (index !== -1) {
      tanks[index].name = name;
      this.saveTanks(tanks);
    }
  }

  static updateThresholds(tankId: string, maxTurbidityFnu: number, fishPct: number) {
    const tanks = this.getTanks();
    const index = tanks.findIndex((t) => t.id === tankId);
    if (index !== -1) {
      tanks[index].thresholds = {
        max_turbidity_fnu: maxTurbidityFnu,
        fish_change_pct: fishPct,
      };
      this.saveTanks(tanks);
    }
  }

  static updateCalibration(tankId: string, feedId: string, waterLineY: number) {
    const liveState = this.getLiveState(tankId);
    const feedIndex = liveState.feeds.findIndex((f) => f.id === feedId);
    if (feedIndex === -1) return;
    liveState.feeds[feedIndex].calibration = { water_line_y: waterLineY };
    this.saveLiveState(tankId, liveState);
  }

  // ─── Readings Operations ───────────────────────────────────────────────────

  static async writeReading(data: {
    tankId: string;
    clarity: number;
    fishCount: number;
    ph?: number;
    temp?: number;
    ammonia?: number;
    nitrite?: number;
  }) {
    const readings = this.getReadings();
    const newReading: ReadingItem = {
      id: `r-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tank_id: data.tankId,
      timestamp: new Date().toISOString(),
      clarity: data.clarity,
      fish_count: data.fishCount,
      fish_count_confidence: 0.95,
      frame_url: '',
    };
    if (data.ph !== undefined) newReading.ph = data.ph;
    if (data.temp !== undefined) newReading.temp = data.temp;
    if (data.ammonia !== undefined) newReading.ammonia = data.ammonia;
    if (data.nitrite !== undefined) newReading.nitrite = data.nitrite;

    readings.unshift(newReading);
    this.saveReadings(readings.slice(0, 50));
  }

  // ─── Alerts Operations ─────────────────────────────────────────────────────

  static resolveAlert(alertId: string) {
    const alerts = this.getAlerts();
    const index = alerts.findIndex((a) => a.id === alertId);
    if (index !== -1) {
      alerts[index].resolved = true;
      this.saveAlerts(alerts);
    }
  }

  // ─── Fish Operations ───────────────────────────────────────────────────────

  static addFish(tankId: string, name: string, imageUrl: string, count: number) {
    const fish = this.getFish(tankId);
    const speciesId = name.toLowerCase().replace(/\s+/g, '_');

    const existingIndex = fish.findIndex((f) => f.speciesId === speciesId);
    if (existingIndex !== -1) {
      fish[existingIndex].count += count;
      fish[existingIndex].detected = fish[existingIndex].count;
      this.saveFish(tankId, fish);
      return;
    }

    const newEntry: FishEntry = {
      id: `fish-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tankId,
      speciesId,
      name,
      imageUrl,
      count,
      detected: count,
    };
    fish.push(newEntry);
    this.saveFish(tankId, fish);
  }

  static updateFishCount(tankId: string, docId: string, count: number) {
    const fish = this.getFish(tankId);
    const index = fish.findIndex((f) => f.id === docId);
    if (index !== -1) {
      fish[index].count = count;
      this.saveFish(tankId, fish);
    }
  }

  static updateDetectedCount(tankId: string, docId: string, detected: number) {
    const fish = this.getFish(tankId);
    const index = fish.findIndex((f) => f.id === docId);
    if (index !== -1) {
      fish[index].detected = detected;
      this.saveFish(tankId, fish);
    }
  }

  static removeFish(tankId: string, docId: string) {
    const fish = this.getFish(tankId);
    const updated = fish.filter((f) => f.id !== docId);
    this.saveFish(tankId, updated);
  }

  // ─── Generic safe write helper for ad-hoc keys ─────────────────────────────

  static safeWriteRaw(key: string, value: string): StorageWriteResult {
    const result = safeSetItem(key, value);
    if (result.success) notifyUpdate(key);
    return result;
  }
}
