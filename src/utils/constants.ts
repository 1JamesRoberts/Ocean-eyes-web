// constants.ts - Shared constants for OceanEyes

// ─── Storage Keys ───────────────────────────────────────────────────────────
export const SNAPSHOTS_STORAGE_KEY = 'oceaneyes_snapshots';
export const RECORDINGS_STORAGE_KEY = 'oceaneyes_recordings';
export const LAST_DIAGNOSIS_TIME_KEY = 'oceaneyes_last_diagnosis_time';

// ─── AI & Inference ─────────────────────────────────────────────────────────
export const AI_POLL_INTERVAL_MS = 10000;
export const BACKEND_HEALTH_CHECK_INTERVAL_MS = 30000;
export const DIAGNOSIS_COOLDOWN_MS = 3600000; // 1 hour between disease diagnoses
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.35;

// ─── Health Score ───────────────────────────────────────────────────────────
export const HEALTH_IDEAL_PH = 7.2;
export const HEALTH_PH_PENALTY_FACTOR = 4;
export const HEALTH_CLARITY_THRESHOLD = 0.5;
export const HEALTH_CLARITY_PENALTY_FACTOR = 0.8;
export const HEALTH_AMMONIA_PENALTY_FACTOR = 20;
export const HEALTH_NITRITE_PENALTY_FACTOR = 3;
export const HEALTH_MAX_SCORE = 10;
export const HEALTH_MIN_SCORE = 1;

// ─── Limits ─────────────────────────────────────────────────────────────────
export const MAX_READINGS_STORED = 50;
export const HISTORY_DEFAULT_LIMIT = 1000;
