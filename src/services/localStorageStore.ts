// localStorageStore.ts - Primary localStorage data layer for OceanEyes
import type { 
  FishEntry, 
  AlertItem, 
  ReadingItem, 
  LiveState, 
  TankBrief 
} from '../types/aquarium';

// Custom event to simulate real-time Firestore sync
const DB_UPDATE_EVENT = 'oceaneyes_db_update';
const notifyUpdate = () => {
  window.dispatchEvent(new CustomEvent(DB_UPDATE_EVENT));
};

export const subscribeToDb = (callback: () => void) => {
  window.addEventListener(DB_UPDATE_EVENT, callback);
  return () => window.removeEventListener(DB_UPDATE_EVENT, callback);
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

export class LocalStorageStore {
  // Local storage lists
  static getTanks = (): TankBrief[] => {
    const tanks = getOrDefault<TankBrief[]>('tanks', []);
    // Schema migration: rename legacy clarity_min threshold to max_turbidity_fnu
    let needsSave = false;
    const migrated = tanks.map((tank) => {
      const legacy = (tank.thresholds as Record<string, unknown>)?.clarity_min;
      if (legacy !== undefined) {
        needsSave = true;
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
    if (needsSave) {
      this.saveTanks(migrated);
    }
    return migrated;
  };
  static saveTanks = (tanks: TankBrief[]) => {
    localStorage.setItem('tanks', JSON.stringify(tanks));
    notifyUpdate();
  };

  static getFish = (): FishEntry[] => getOrDefault<FishEntry[]>('tank_fish', []);
  static saveFish = (fish: FishEntry[]) => {
    localStorage.setItem('tank_fish', JSON.stringify(fish));
    notifyUpdate();
  };

  static getReadings = (): ReadingItem[] => getOrDefault<ReadingItem[]>('readings', []);
  static saveReadings = (readings: ReadingItem[]) => {
    localStorage.setItem('readings', JSON.stringify(readings));
    notifyUpdate();
  };

  static getAlerts = (): AlertItem[] => getOrDefault<AlertItem[]>('alerts', []);
  static saveAlerts = (alerts: AlertItem[]) => {
    localStorage.setItem('alerts', JSON.stringify(alerts));
    notifyUpdate();
  };

  static getLiveState = (tankId: string): LiveState => {
    const key = `live_state_${tankId}`;
    const defaultState: LiveState = {
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
          mock_image: '/mock_camera_main.png'
        }
      ]
    };
    const state = getOrDefault<LiveState>(key, defaultState);

    // Schema Migration: enforce strictly 1 camera feed
    let needsSave = false;
    if (!state.feeds || !Array.isArray(state.feeds) || state.feeds.length === 0) {
      state.feeds = defaultState.feeds;
      needsSave = true;
    }
    if (state.feeds.length > 1) {
      state.feeds = defaultState.feeds;
      needsSave = true;
    }
    if (!state.selected_feed_id) {
      state.selected_feed_id = defaultState.selected_feed_id;
      needsSave = true;
    }

    const isWebcam = state.feeds[0].stream_url?.startsWith('webcam:');
    if (!isWebcam && state.feeds[0].mock_image !== '/mock_camera_main.png') {
      state.feeds[0].mock_image = '/mock_camera_main.png';
      needsSave = true;
    }

    if (needsSave) {
      this.saveLiveState(tankId, state);
    }

    return state;
  };

  static saveLiveState = (tankId: string, state: LiveState) => {
    localStorage.setItem(`live_state_${tankId}`, JSON.stringify(state));
    notifyUpdate();
  };

  static switchActiveFeed = (tankId: string, feedId: string) => {
    const liveState = this.getLiveState(tankId);
    const activeFeed = liveState.feeds.find(f => f.id === feedId);
    if (activeFeed) {
      liveState.selected_feed_id = feedId;
      liveState.stream_url = activeFeed.stream_url;
      liveState.current_clarity = activeFeed.current_clarity;
      liveState.current_fish_count = activeFeed.current_fish_count;
      liveState.started_at = activeFeed.started_at;
      this.saveLiveState(tankId, liveState);
    }
  };

  // ─── Tank Operations ─────────────────────────────────────────────────────────

  static async createTank(name: string, cameraSource?: { type: 'mock' | 'webcam'; deviceId?: string }): Promise<string> {
    const id = `tank-${Math.floor(Math.random() * 900000) + 100000}`;
    const tanks = this.getTanks();
    const newTank: TankBrief = {
      id,
      name,
      owner_id: 'anon-user-123',
      created_at: new Date().toISOString(),
      thresholds: { max_turbidity_fnu: 5.0, fish_change_pct: 50.0 },
      calibration: { water_line_y: 120 }
    };
    tanks.push(newTank);
    this.saveTanks(tanks);

    // Initialize LiveState for the tank using selected webcam or default mock settings
    const isWebcam = cameraSource?.type === 'webcam';
    const liveState: LiveState = {
      is_live: false,
      stream_url: isWebcam ? `webcam:${cameraSource?.deviceId || 'default'}` : 'rtsp://oceaneyes.iot/live-stream-09',
      started_at: null,
      last_ping_at: null,
      current_clarity: 1.2,
      current_fish_count: 0,
      selected_feed_id: 'feed-main',
      feeds: [
        {
          id: 'feed-main',
          name: isWebcam ? 'Local Webcam' : 'Main View',
          stream_url: isWebcam ? `webcam:${cameraSource?.deviceId || 'default'}` : 'rtsp://oceaneyes.iot/live-stream-09',
          is_live: false,
          started_at: null,
          current_clarity: 1.2,
          current_fish_count: 0,
          mock_image: isWebcam ? '' : '/mock_camera_main.png'
        }
      ]
    };
    this.saveLiveState(id, liveState);

    // Initial reading
    await this.writeReading({
      tankId: id,
      clarity: 8.0,
      fishCount: 0,
      ph: 7.2,
      temp: 26.0,
      ammonia: 0,
      nitrite: 0
    });

    return id;
  }

  static async joinTank(tankId: string): Promise<boolean> {
    const tanks = this.getTanks();
    const found = tanks.find(t => t.id === tankId);
    if (!found) return false;

    // Save in user linked tanks
    const userTanks = getOrDefault<string[]>('user_tanks', []);
    if (!userTanks.includes(tankId)) {
      userTanks.push(tankId);
      localStorage.setItem('user_tanks', JSON.stringify(userTanks));
    }
    notifyUpdate();
    return true;
  }

  static getLinkedTanks(): string[] {
    return getOrDefault<string[]>('user_tanks', []);
  }

  static unlinkTank(tankId: string) {
    const userTanks = this.getLinkedTanks();
    const updated = userTanks.filter(id => id !== tankId);
    localStorage.setItem('user_tanks', JSON.stringify(updated));
    notifyUpdate();
  }

  static updateTankName(tankId: string, name: string) {
    const tanks = this.getTanks();
    const index = tanks.findIndex(t => t.id === tankId);
    if (index !== -1) {
      tanks[index].name = name;
      this.saveTanks(tanks);
    }
  }

  static updateThresholds(tankId: string, maxTurbidityFnu: number, fishPct: number) {
    const tanks = this.getTanks();
    const index = tanks.findIndex(t => t.id === tankId);
    if (index !== -1) {
      tanks[index].thresholds = {
        max_turbidity_fnu: maxTurbidityFnu,
        fish_change_pct: fishPct
      };
      this.saveTanks(tanks);
    }
  }

  static updateCalibration(tankId: string, feedId: string, waterLineY: number) {
    if (feedId) {
      const liveState = this.getLiveState(tankId);
      const feedIndex = liveState.feeds.findIndex(f => f.id === feedId);
      if (feedIndex !== -1) {
        liveState.feeds[feedIndex].calibration = { water_line_y: waterLineY };
        this.saveLiveState(tankId, liveState);
      }
    }
    const tanks = this.getTanks();
    const index = tanks.findIndex(t => t.id === tankId);
    if (index !== -1) {
      tanks[index].calibration = { water_line_y: waterLineY };
      this.saveTanks(tanks);
    }
  }

  // ─── Readings Operations ─────────────────────────────────────────────────────

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
      ph: data.ph ?? 7.2,
      temp: data.temp ?? 26.0,
      ammonia: data.ammonia ?? 0.0,
      nitrite: data.nitrite ?? 0.05
    };
    readings.unshift(newReading); // Newest first
    this.saveReadings(readings.slice(0, 50)); // Cap at 50 readings
  }

  // ─── Alerts Operations ───────────────────────────────────────────────────────

  static resolveAlert(alertId: string) {
    const alerts = this.getAlerts();
    const index = alerts.findIndex(a => a.id === alertId);
    if (index !== -1) {
      alerts[index].resolved = true;
      this.saveAlerts(alerts);
    }
  }

  // ─── Fish Operations ─────────────────────────────────────────────────────────

  /**
   * Add fish to the global inventory.
   * @param _unusedTankId Per-tank fish ownership is not implemented; this parameter is ignored.
   */
  static addFish(_unusedTankId: string, name: string, imageUrl: string, count: number) {
    const fish = this.getFish();
    const speciesId = name.toLowerCase().replace(/\s+/g, '_');

    // Check if this species already exists
    const existingIndex = fish.findIndex(f => f.speciesId === speciesId);
    if (existingIndex !== -1) {
      // Increment count of existing entry
      fish[existingIndex].count += count;
      fish[existingIndex].detected = fish[existingIndex].count;
      this.saveFish(fish);
      return;
    }

    const newEntry: FishEntry = {
      id: `fish-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      speciesId,
      name,
      imageUrl,
      count,
      detected: count // Start as fully detected
    };
    fish.push(newEntry);
    this.saveFish(fish);
  }

  static updateFishCount(docId: string, count: number) {
    const fish = this.getFish();
    const index = fish.findIndex(f => f.id === docId);
    if (index !== -1) {
      fish[index].count = count;
      this.saveFish(fish);
    }
  }

  static updateDetectedCount(docId: string, detected: number) {
    const fish = this.getFish();
    const index = fish.findIndex(f => f.id === docId);
    if (index !== -1) {
      fish[index].detected = detected;
      this.saveFish(fish);
    }
  }

  static removeFish(docId: string) {
    const fish = this.getFish();
    const updated = fish.filter(f => f.id !== docId);
    this.saveFish(updated);
  }
}
