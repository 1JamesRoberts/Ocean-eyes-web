import { describe, expect, it } from 'vitest';
import { analyticsTooltipMaterialStyle } from '../analyticsTooltipMaterial';

describe('analyticsTooltipMaterialStyle', () => {
  it('locks the translucent material without using an ambiguous background shorthand', () => {
    expect(analyticsTooltipMaterialStyle).toEqual({
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      borderRadius: '1rem',
      fontSize: 13,
    });
    expect('background' in analyticsTooltipMaterialStyle).toBe(false);
  });
});
