// src/services/readingSimulator.ts - Simulated reading generation
import type { ReadingItem } from '../types/aquarium';

export interface SimulatedReadingParams {
  tankId: string;
  totalDetected: number;
}

export function generateSimulatedReading(params: SimulatedReadingParams): Omit<ReadingItem, 'id' | 'timestamp'> {
  const { tankId, totalDetected } = params;
  
  return {
    tank_id: tankId,
    clarity: parseFloat((0.5 + Math.random() * 4.5).toFixed(2)),
    fish_count: totalDetected,
    fish_count_confidence: 0.95,
    frame_url: '',
    ph: parseFloat((7.1 + Math.random() * 0.3).toFixed(1)),
    temp: parseFloat((25.5 + Math.random() * 1.2).toFixed(1)),
    ammonia: Math.random() > 0.9 ? 0.02 : 0.0,
    nitrite: parseFloat((0.05 + Math.random() * 0.1).toFixed(2))
  };
}
