import { describe, it, expect } from 'vitest';
import { buildDiseaseAlert } from '../services/alertBuilder';
import type { AIDetection } from '../../types/aquarium';

describe('alertBuilder', () => {
  const baseDetection: AIDetection = {
    bbox: [0, 0, 1, 1],
    bbox_normalized: [0, 0, 1, 1],
    detection_confidence: 0.9,
    species: 'angelfish',
    species_display: 'Angelfish',
    confidence: 0.95,
    below_threshold: false,
    diagnosis: {
      healthy: false,
      disease: 'Ich',
      confidence: 0.88,
      description: 'White spots visible on fins.',
      treatment: 'Raise temperature gradually and treat with ich medication.',
    },
  };

  it('builds a critical disease alert from a detection', () => {
    const alert = buildDiseaseAlert(baseDetection, '2026-06-20T10:00:00Z');
    expect(alert.severity).toBe('critical');
    expect(alert.title).toContain('Ich');
    expect(alert.message).toContain('Angelfish');
    expect(alert.message).toContain('White spots');
    expect(alert.tip).toContain('Raise temperature');
    expect(alert.timestamp).toBe('2026-06-20T10:00:00Z');
    expect(alert.resolved).toBe(false);
  });

  it('throws when detection has no diagnosis', () => {
    const detection = { ...baseDetection, diagnosis: undefined };
    expect(() => buildDiseaseAlert(detection)).toThrow(
      'buildDiseaseAlert requires a non-healthy diagnosis'
    );
  });

  it('throws when diagnosis reports healthy', () => {
    const detection: AIDetection = {
      ...baseDetection,
      diagnosis: {
        healthy: true,
        disease: null,
        confidence: 0.99,
        description: 'No issues detected.',
        treatment: '',
      },
    };
    expect(() => buildDiseaseAlert(detection)).toThrow(
      'buildDiseaseAlert requires a non-healthy diagnosis'
    );
  });
});
