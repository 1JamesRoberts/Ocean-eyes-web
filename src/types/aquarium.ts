// src/types/aquarium.ts - Shared interface types for OceanEyes

export interface FishEntry {
  id: string;
  tankId: string;
  speciesId: string;
  name: string;
  imageUrl: string;
  count: number;
  detected: number;
}

// ─── Species Detail Types (from selectyourfish.com) ────────────────────────

export type Difficulty = 'beginner' | 'easy' | 'medium' | 'difficult';
export type Availability = 'very_common' | 'common' | 'rare' | 'very_rare';
export type BehaviorType = 'schooling' | 'social' | 'solitary';
export type Aggression = 'peaceful' | 'mostly_peaceful' | 'aggressive';
export type SwimLocation = 'bottom' | 'middle' | 'top';
export type BreedingDifficulty = 'easy' | 'medium' | 'hard' | 'no_record';
export type Region =
  | 'south_america' | 'central_america' | 'north_america'
  | 'africa' | 'europe' | 'australia'
  | 'southeast_asia' | 'south_asia' | 'east_asia' | 'west_asia'
  | 'artificial';

export type CreatureType = 'fish' | 'shrimp' | 'snail' | 'crab';

export interface SpeciesDetail {
  scientificName: string;
  sizeCm: number;
  tempMin: number;
  tempMax: number;
  phMin: number;
  phMax: number;
  minTankSizeL: number;
  difficulty: Difficulty;
  availability: Availability;
  behavior: BehaviorType;
  aggression: Aggression;
  swimLocation: SwimLocation;
  breeding: BreedingDifficulty;
  origin: string;
  region: Region[];
  /** Alternative/common name (e.g. "Siamese fighting fish" for Betta) */
  altName?: string;
  /** Taxonomic family (e.g. "Characidae", "Cichlidae") */
  family?: string;
  /** Original numeric ID from selectyourfish.com (enables image URL lookup) */
  fishId?: string;
  /** Creature classification */
  creatureType?: CreatureType;
  /** Whether extended info/detail page exists on the source */
  hasExtendedInfo?: boolean;
}

export interface AlertItem {
  id: string;
  title: string;
  message: string;
  tip: string;
  severity: 'info' | 'warning' | 'critical' | 'good';
  timeAgo: string;
  clarityBefore: string;
  clarityAfter: string;
  fishBefore: string;
  fishAfter: string;
  resolved: boolean;
  timestamp: string;
}

export interface ReadingItem {
  id: string;
  tank_id: string;
  timestamp: string;
  clarity: number;
  fish_count: number;
  fish_count_confidence: number;
  frame_url: string;
  /** Real sensor pH value, or undefined if no sensor data is available. */
  ph?: number;
  /** Real sensor temperature (°C), or undefined if no sensor data is available. */
  temp?: number;
  /** Real sensor ammonia (ppm), or undefined if no sensor data is available. */
  ammonia?: number;
  /** Real sensor nitrite (ppm), or undefined if no sensor data is available. */
  nitrite?: number;
}

export interface CameraFeedConfig {
  id: string;
  name: string;
  stream_url: string;
  is_live: boolean;
  started_at: string | null;
  current_clarity: number;
  current_fish_count: number;
  mock_image?: string;
  calibration?: {
    water_line_y: number;
  };
}

export interface LiveState {
  is_live: boolean;
  stream_url: string;
  started_at: string | null;
  last_ping_at: string | null;
  current_clarity: number;
  current_fish_count: number;
  selected_feed_id: string;
  feeds: CameraFeedConfig[];
  /** Whether AI analysis is currently enabled on the live feed. */
  ai_active?: boolean;
  /** Last successful AI detection result, persisted across tab switches. */
  last_prediction?: AIDetectionResult | null;
  /** Last successful AI turbidity result, persisted across tab switches. */
  last_turbidity_result?: AITurbidityResult | null;
}

export interface TankBrief {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  thresholds: {
    max_turbidity_fnu: number;
    fish_change_pct: number;
  };
  /** @deprecated Calibration now lives on CameraFeedConfig inside LiveState. */
  calibration?: {
    water_line_y: number;
  };
}

export interface CameraFilters {
  contrast: number;
  brightness: number;
  saturation: number;
  temperature: number;
  tint: number;
}

export interface FilterPreset {
  id: string;
  name: string;
  isCustom: boolean;
  filters: CameraFilters;
}

// ─── AI Inference Types ─────────────────────────────────────────────────────

export interface FishDiagnosis {
  healthy: boolean;
  disease: string | null;
  confidence: number;
  description: string;
  treatment: string;
  error?: string;
  /** URL path to the cropped fish image that was sent to the LLM for diagnosis */
  crop_url?: string;
}

export interface AIDetection {
  bbox: [number, number, number, number];
  bbox_normalized: [number, number, number, number];
  detection_confidence: number;
  species: string;
  species_display: string;
  confidence: number;
  below_threshold: boolean;
  /** Species confidence threshold used to compute below_threshold. May be absent in legacy records. */
  threshold?: number;
  diagnosis?: FishDiagnosis | null;
}

export interface AITurbidity {
  fnu: number;
  top_class: string;
  top_confidence: number;
  all_probabilities: Record<string, number>;
}

export interface AISummary {
  total_detections: number;
  species_counts: Record<string, number>;
}

export interface AIPredictionResult {
  timestamp: string;
  /** Original image dimensions. Legacy records may omit this field. */
  image_dimensions?: { width: number; height: number };
  models: {
    detection: { provider: string };
    species: { provider: string };
    turbidity: { provider: string };
  };
  turbidity: AITurbidity;
  detections: AIDetection[];
  summary: AISummary;
}

export interface AIDetectionResult {
  timestamp: string;
  /** Original image dimensions. Legacy records may omit this field. */
  image_dimensions?: { width: number; height: number };
  models: {
    detection: { provider: string };
    species: { provider: string };
  };
  detections: AIDetection[];
  summary: AISummary;
}

export interface AITurbidityResult {
  timestamp: string;
  /** Original image dimensions. Turbidity-only records may omit this field. */
  image_dimensions?: { width: number; height: number };
  models: {
    turbidity: { provider: string };
  };
  turbidity: AITurbidity;
}

// ─── History API Types ──────────────────────────────────────────────────────

export interface HistoryDetectionResponse {
  date: string;
  count: number;
  records: AIDetectionResult[];
}

export interface HistoryTurbidityResponse {
  date: string;
  count: number;
  records: AITurbidityResult[];
}

// ─── Analytics Date Range Type ─────────────────────────────────────────────

export interface DateRange {
  /** Start date as YYYY-MM-DD */
  startDate: string;
  /** End date as YYYY-MM-DD */
  endDate: string;
  /** Start time as HH:mm (24-hour) */
  startTime: string;
  /** End time as HH:mm (24-hour) */
  endTime: string;
}
