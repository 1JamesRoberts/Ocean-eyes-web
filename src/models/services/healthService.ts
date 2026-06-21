// src/models/services/healthService.ts - Pure health score calculation
import {
  HEALTH_IDEAL_PH,
  HEALTH_PH_PENALTY_FACTOR,
  HEALTH_CLARITY_THRESHOLD,
  HEALTH_CLARITY_PENALTY_FACTOR,
  HEALTH_AMMONIA_PENALTY_FACTOR,
  HEALTH_NITRITE_PENALTY_FACTOR,
  HEALTH_MAX_SCORE,
  HEALTH_MIN_SCORE,
} from '../../utils/constants';

export interface HealthReading {
  ph?: number;
  clarity: number;
  ammonia?: number;
  nitrite?: number;
}

export function calculateHealthScore(reading: HealthReading): number {
  const ph = reading.ph ?? HEALTH_IDEAL_PH;
  const ammonia = reading.ammonia ?? 0;
  const nitrite = reading.nitrite ?? 0;
  const clarity = reading.clarity ?? 0;
  const score = Math.max(
    HEALTH_MIN_SCORE,
    HEALTH_MAX_SCORE -
      Math.abs(HEALTH_IDEAL_PH - ph) * HEALTH_PH_PENALTY_FACTOR -
      Math.max(0, clarity - HEALTH_CLARITY_THRESHOLD) * HEALTH_CLARITY_PENALTY_FACTOR -
      ammonia * HEALTH_AMMONIA_PENALTY_FACTOR -
      nitrite * HEALTH_NITRITE_PENALTY_FACTOR
  );

  return parseFloat(score.toFixed(1));
}

export function getHealthColor(score: number): string {
  if (score >= 8) return 'var(--color-good)';
  if (score >= 6) return 'var(--color-warning)';
  return 'var(--color-critical)';
}

export function getHealthMessage(score: number): string {
  if (score >= 8) {
    return 'All core parameters (clarity, temperature, pH, ammonia, nitrite) are in excellent safe bands. System is functioning optimally.';
  }
  if (score >= 6) {
    return 'Mild parameter fluctuations detected. Observe filters and run water test diagnostics closely.';
  }
  return 'Critical metric violation! Immediate action required to check filter sponge and adjust tank chemistry.';
}
