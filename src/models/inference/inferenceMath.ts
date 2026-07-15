import type { AITurbidity } from '../../types/aquarium';
import {
  TURBIDITY_CLASSES,
  TURBIDITY_COEFFICIENTS,
  TURBIDITY_CONSTANT,
} from './modelConfig';

export function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

export function softmax(values: Float32Array): Float32Array {
  let maximum = Number.NEGATIVE_INFINITY;
  for (const value of values) maximum = Math.max(maximum, value);

  const probabilities = new Float32Array(values.length);
  let total = 0;
  for (let index = 0; index < values.length; index += 1) {
    const probability = Math.exp(values[index] - maximum);
    probabilities[index] = probability;
    total += probability;
  }
  for (let index = 0; index < probabilities.length; index += 1) {
    probabilities[index] /= total;
  }
  return probabilities;
}

export function indexOfMaximum(values: Float32Array): number {
  let bestIndex = 0;
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] > values[bestIndex]) bestIndex = index;
  }
  return bestIndex;
}

export function displayClassName(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

export function calculateTurbidity(probabilities: Float32Array): AITurbidity {
  let fnu = TURBIDITY_CONSTANT;
  const allProbabilities: Record<string, number> = {};

  for (let index = 0; index < TURBIDITY_CLASSES.length; index += 1) {
    const probability = probabilities[index] ?? 0;
    fnu += TURBIDITY_COEFFICIENTS[index] * probability;
    allProbabilities[TURBIDITY_CLASSES[index]] = probability;
  }

  const topIndex = indexOfMaximum(probabilities);
  return {
    fnu: Math.round(fnu * 100) / 100,
    top_class: TURBIDITY_CLASSES[topIndex],
    top_confidence: Math.round(probabilities[topIndex] * 1_000_000) / 1_000_000,
    all_probabilities: allProbabilities,
  };
}
