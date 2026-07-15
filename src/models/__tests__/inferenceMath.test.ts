import { describe, expect, it } from 'vitest';
import { calculateTurbidity, displayClassName, sigmoid, softmax } from '../inference/inferenceMath';

describe('browser inference math', () => {
  it('matches the Python sigmoid and softmax behavior', () => {
    expect(sigmoid(0)).toBe(0.5);
    expect(Array.from(softmax(new Float32Array([1, 2, 3])))).toEqual([
      expect.closeTo(0.0900306, 6),
      expect.closeTo(0.2447285, 6),
      expect.closeTo(0.6652409, 6),
    ]);
  });

  it('calculates FNU using the model metadata coefficients', () => {
    const probabilities = new Float32Array(11);
    probabilities[0] = 1;
    expect(calculateTurbidity(probabilities)).toMatchObject({
      fnu: 0.44,
      top_class: '00-0.49',
      top_confidence: 1,
    });
  });

  it('formats model class slugs for the UI', () => {
    expect(displayClassName('rummy_nose_tetra')).toBe('Rummy Nose Tetra');
  });
});
