// src/services/healthCalculator.ts - Pure health score calculation
export interface HealthReading {
  ph: number;
  clarity: number;
  ammonia: number;
  nitrite: number;
}

export function calculateHealthScore(reading: HealthReading): number {
  const score = Math.max(
    1,
    10 -
      Math.abs(7.2 - reading.ph) * 4 -
      Math.max(0, reading.clarity - 0.5) * 0.8 -
      reading.ammonia * 20 -
      reading.nitrite * 3
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
