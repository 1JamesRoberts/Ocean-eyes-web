// chemistryService.ts - Deterministic water chemistry parameter generation

export interface SimulatedChemistry {
  ph: number;
  temp: number;
  ammonia: number;
  nitrite: number;
}

export interface ChemistryRng {
  random: () => number;
}

function makeDefaultRng(): ChemistryRng {
  return { random: () => Math.random() };
}

export function generateSimulatedChemistry(
  rngOrSeed?: ChemistryRng | number
): SimulatedChemistry {
  let rng: ChemistryRng;
  if (rngOrSeed === undefined) {
    rng = makeDefaultRng();
  } else if (typeof rngOrSeed === 'number') {
    rng = mulberry32(rngOrSeed);
  } else {
    rng = rngOrSeed;
  }

  return {
    ph: parseFloat((7.1 + rng.random() * 0.3).toFixed(1)),
    temp: parseFloat((25.5 + rng.random() * 1.2).toFixed(1)),
    ammonia: rng.random() > 0.9 ? 0.02 : 0.0,
    nitrite: parseFloat((0.05 + rng.random() * 0.1).toFixed(2)),
  };
}

function mulberry32(seed: number): ChemistryRng {
  let t = seed >>> 0;
  return {
    random: () => {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    },
  };
}
