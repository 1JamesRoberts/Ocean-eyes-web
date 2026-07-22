// constants.ts - Shared constants for OceanEyes

// ─── AI & Inference ─────────────────────────────────────────────────────────
export const AI_POLL_INTERVAL_MS = 10000;
export const BACKEND_HEALTH_CHECK_INTERVAL_MS = 30000;
export const DETECTION_CONFIDENCE = 0.35;
export const BACKEND_OFFLINE_MESSAGE =
  'On-device AI is not supported by this browser. Update your browser and try again.';

// ─── Health Score ───────────────────────────────────────────────────────────
export const HEALTH_IDEAL_PH = 7.2;
export const HEALTH_PH_PENALTY_FACTOR = 4;
export const HEALTH_CLARITY_THRESHOLD = 0.5;
export const HEALTH_CLARITY_PENALTY_FACTOR = 0.8;
export const HEALTH_AMMONIA_PENALTY_FACTOR = 20;
export const HEALTH_NITRITE_PENALTY_FACTOR = 3;
export const HEALTH_MAX_SCORE = 10;
export const HEALTH_MIN_SCORE = 1;
