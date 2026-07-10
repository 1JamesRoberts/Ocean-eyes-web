// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { Plus } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { GlassButton } from '../GlassButton';

describe('GlassButton', () => {
  it('uses an inverse foreground for primary button text and icons', () => {
    render(
      <GlassButton variant="primary" size="sm">
        <Plus aria-hidden="true" />
        Add fish
      </GlassButton>,
    );

    const button = screen.getByRole('button', { name: 'Add fish' });

    expect(button.classList.contains('text-text-inverse')).toBe(true);
    expect(button.querySelector('svg')).toBeTruthy();
  });
});
