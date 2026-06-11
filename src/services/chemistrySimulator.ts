// src/services/chemistrySimulator.ts - Simulated chemistry parameters only
// pH, temp, ammonia, and nitrite are not yet available from the AI pipeline;
// this module provides stable placeholder values until real sensor data is wired.

export interface SimulatedChemistry {
  ph: number;
  temp: number;
  ammonia: number;
  nitrite: number;
}

export function generateSimulatedChemistry(): SimulatedChemistry {
  return {
    ph: parseFloat((7.1 + Math.random() * 0.3).toFixed(1)),
    temp: parseFloat((25.5 + Math.random() * 1.2).toFixed(1)),
    ammonia: Math.random() > 0.9 ? 0.02 : 0.0,
    nitrite: parseFloat((0.05 + Math.random() * 0.1).toFixed(2)),
  };
}
