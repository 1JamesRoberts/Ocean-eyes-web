// mock_service.ts - Simulated Firestore Service for OceanEyes
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

// Initial Seed Data (if localStorage is empty)
const SEED_TANKS: TankBrief[] = [
  {
    id: 'living-room-tank-77',
    name: 'Living Room Reef',
    owner_id: 'anon-user-123',
    created_at: new Date().toISOString(),
    thresholds: { clarity_min: 6.0, fish_change_pct: 50.0 },
    calibration: { water_line_y: 120 }
  },
  {
    id: 'office-reef-55',
    name: 'Office Nano Reef',
    owner_id: 'anon-user-123',
    created_at: new Date().toISOString(),
    thresholds: { clarity_min: 4.0, fish_change_pct: 40.0 },
    calibration: { water_line_y: 100 }
  }
];

const SEED_FISH: FishEntry[] = [
  { id: 'f1', speciesId: 'neon_tetra', name: 'Neon Tetra', imageUrl: 'species-neon-tetra', count: 6, detected: 0 },
  { id: 'f2', speciesId: 'guppy', name: 'Guppy', imageUrl: 'species-guppy', count: 3, detected: 0 },
  { id: 'f3', speciesId: 'corydoras', name: 'Corydoras', imageUrl: 'species-corydoras', count: 2, detected: 0 }
];

const SEED_READINGS: ReadingItem[] = [
  { id: 'r7', tank_id: 'living-room-tank-77', timestamp: new Date(Date.now() - 60000 * 2).toISOString(), clarity: 1.2, fish_count: 0, fish_count_confidence: 0.95, frame_url: '', ph: 7.2, temp: 26.1, ammonia: 0.0, nitrite: 0.1 },
  { id: 'r6', tank_id: 'living-room-tank-77', timestamp: new Date(Date.now() - 3600000 * 1).toISOString(), clarity: 1.0, fish_count: 0, fish_count_confidence: 0.98, frame_url: '', ph: 7.2, temp: 26.0, ammonia: 0.0, nitrite: 0.1 },
  { id: 'r5', tank_id: 'living-room-tank-77', timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), clarity: 1.5, fish_count: 0, fish_count_confidence: 0.88, frame_url: '', ph: 7.3, temp: 25.9, ammonia: 0.01, nitrite: 0.1 },
  { id: 'r4', tank_id: 'living-room-tank-77', timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), clarity: 0.8, fish_count: 0, fish_count_confidence: 0.92, frame_url: '', ph: 7.1, temp: 26.2, ammonia: 0.0, nitrite: 0.08 },
  { id: 'r3', tank_id: 'living-room-tank-77', timestamp: new Date(Date.now() - 3600000 * 12).toISOString(), clarity: 0.5, fish_count: 0, fish_count_confidence: 0.95, frame_url: '', ph: 7.2, temp: 26.1, ammonia: 0.0, nitrite: 0.07 },
  { id: 'r2', tank_id: 'living-room-tank-77', timestamp: new Date(Date.now() - 86400000 * 1).toISOString(), clarity: 0.4, fish_count: 0, fish_count_confidence: 0.97, frame_url: '', ph: 7.2, temp: 26.1, ammonia: 0.0, nitrite: 0.05 },
  { id: 'r1', tank_id: 'living-room-tank-77', timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), clarity: 0.3, fish_count: 0, fish_count_confidence: 0.96, frame_url: '', ph: 7.2, temp: 25.8, ammonia: 0.0, nitrite: 0.05 }
];

const SEED_ALERTS: AlertItem[] = [
  {
    id: 'a1',
    title: 'Water clarity dropped',
    message: 'Turbidity rose from 0.5 to 1.5 FNU in 2 hours. Possible filter issue.',
    tip: 'Check your filter intake for debris. A sudden clarity drop often indicates a clogged filter sponge or disturbed substrate. Consider a 20–30% water change if it persists after cleaning.',
    severity: 'warning',
    timeAgo: '3 hours ago',
    clarityBefore: '0.5',
    clarityAfter: '1.5',
    fishBefore: '10',
    fishAfter: '10',
    resolved: false,
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString()
  },
  {
    id: 'a2',
    title: 'Only 4 of 6 Neon Tetras visible',
    message: 'Neon Tetra count below 50% of expected for 35 minutes.',
    tip: 'Fish may be hiding behind plants or decor. Check if lights are on and the filter is running. Tetras sometimes school tightly in one corner when stressed. Test water parameters if hiding persists.',
    severity: 'warning',
    timeAgo: 'Yesterday',
    clarityBefore: '8.1',
    clarityAfter: '8.1',
    fishBefore: '6',
    fishAfter: '4',
    resolved: true,
    timestamp: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'a3',
    title: 'Daily report',
    message: 'Clarity 8/10 · 10 fish visible · All healthy',
    tip: 'Your tank looks great! No action needed. Continue your regular maintenance schedule.',
    severity: 'info',
    timeAgo: 'Yesterday 8:00 AM',
    clarityBefore: '',
    clarityAfter: '',
    fishBefore: '',
    fishAfter: '',
    resolved: true,
    timestamp: new Date(Date.now() - 86400000 - 3600000 * 4).toISOString()
  }
];

const getOrSet = <T>(key: string, seed: T): T => {
  const data = localStorage.getItem(key);
  if (data === null) {
    localStorage.setItem(key, JSON.stringify(seed));
    return seed;
  }
  return JSON.parse(data);
};

export class MockFirestore {
  // Local storage lists
  static getTanks = (): TankBrief[] => {
    const defaultTanks = SEED_TANKS;
    const stored = localStorage.getItem('tanks');
    if (!stored) {
      localStorage.setItem('tanks', JSON.stringify(defaultTanks));
      return defaultTanks;
    }
    try {
      const parsed = JSON.parse(stored) as TankBrief[];
      let updated = false;
      defaultTanks.forEach(dt => {
        if (!parsed.some(t => t.id === dt.id)) {
          parsed.push(dt);
          updated = true;
        }
      });
      if (updated) {
        localStorage.setItem('tanks', JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      localStorage.setItem('tanks', JSON.stringify(defaultTanks));
      return defaultTanks;
    }
  };
  static saveTanks = (tanks: TankBrief[]) => {
    localStorage.setItem('tanks', JSON.stringify(tanks));
    notifyUpdate();
  };

  static getFish = (): FishEntry[] => getOrSet('tank_fish', SEED_FISH);
  static saveFish = (fish: FishEntry[]) => {
    localStorage.setItem('tank_fish', JSON.stringify(fish));
    notifyUpdate();
  };

  static getReadings = (): ReadingItem[] => getOrSet('readings', SEED_READINGS);
  static saveReadings = (readings: ReadingItem[]) => {
    localStorage.setItem('readings', JSON.stringify(readings));
    notifyUpdate();
  };

  static getAlerts = (): AlertItem[] => getOrSet('alerts', SEED_ALERTS);
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
    const state = getOrSet(key, defaultState);

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

    if (state.feeds[0].mock_image !== '/mock_camera_main.png') {
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

  // Prototype constraint: strictly 1 camera per tank
  // addCameraFeed and deleteCameraFeed removed - single camera only

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

  static async createTank(name: string): Promise<string> {
    const id = `tank-${Math.floor(Math.random() * 900000) + 100000}`;
    const tanks = this.getTanks();
    const newTank: TankBrief = {
      id,
      name,
      owner_id: 'anon-user-123',
      created_at: new Date().toISOString(),
    thresholds: { clarity_min: 5.0, fish_change_pct: 50.0 },
      calibration: { water_line_y: 120 }
    };
    tanks.push(newTank);
    this.saveTanks(tanks);

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
    const userTanks = getOrSet<string[]>('user_tanks', ['living-room-tank-77', 'office-reef-55']);
    if (!userTanks.includes(tankId)) {
      userTanks.push(tankId);
      localStorage.setItem('user_tanks', JSON.stringify(userTanks));
    }
    notifyUpdate();
    return true;
  }

  static getLinkedTanks(): string[] {
    const defaultLinked = ['living-room-tank-77', 'office-reef-55'];
    const stored = localStorage.getItem('user_tanks');
    if (!stored) {
      localStorage.setItem('user_tanks', JSON.stringify(defaultLinked));
      return defaultLinked;
    }
    try {
      const parsed = JSON.parse(stored) as string[];
      let updated = false;
      defaultLinked.forEach(id => {
        if (!parsed.includes(id)) {
          parsed.push(id);
          updated = true;
        }
      });
      if (updated) {
        localStorage.setItem('user_tanks', JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      localStorage.setItem('user_tanks', JSON.stringify(defaultLinked));
      return defaultLinked;
    }
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

  static updateThresholds(tankId: string, clarityMin: number, fishPct: number) {
    const tanks = this.getTanks();
    const index = tanks.findIndex(t => t.id === tankId);
    if (index !== -1) {
      tanks[index].thresholds = {
        clarity_min: clarityMin,
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

  static addFish(_tankId: string, name: string, imageUrl: string, count: number) {
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

  static updateFishSpecies(docId: string, name: string, imageUrl: string) {
    const fish = this.getFish();
    const index = fish.findIndex(f => f.id === docId);
    if (index !== -1) {
      fish[index].name = name;
      fish[index].imageUrl = imageUrl;
      fish[index].speciesId = name.toLowerCase().replace(/\s+/g, '_');
      this.saveFish(fish);
    }
  }

  static updateDetected(docId: string, detected: number) {
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
