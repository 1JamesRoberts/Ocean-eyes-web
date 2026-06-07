// src/types/aquarium.ts - Shared interface types for OceanEyes

export interface SpeciesCount {
  name: string;
  emoji: string;
  color: string;
  count: number;
  expectedCount: number;
  weeklyHistory: number[];
}

export interface FishEntry {
  id: string;
  speciesId: string;
  name: string;
  imageUrl: string;
  count: number;
  detected: number;
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
  ph: number;
  temp: number;
  ammonia: number;
  nitrite: number;
}

export interface CameraFeed {
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
  feeds: CameraFeed[];
}

export interface TankBrief {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  thresholds: {
    clarity_min: number;
    fish_change_pct: number;
  };
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

export interface AIDetection {
  bbox: [number, number, number, number];
  bbox_normalized: [number, number, number, number];
  detection_confidence: number;
  species: string;
  species_display: string;
  confidence: number;
  below_threshold: boolean;
  threshold: number;
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
  image_dimensions: { width: number; height: number };
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
  image_dimensions: { width: number; height: number };
  models: {
    detection: { provider: string };
    species: { provider: string };
  };
  detections: AIDetection[];
  summary: AISummary;
}

export interface AITurbidityResult {
  timestamp: string;
  image_dimensions: { width: number; height: number };
  models: {
    turbidity: { provider: string };
  };
  turbidity: AITurbidity;
}
