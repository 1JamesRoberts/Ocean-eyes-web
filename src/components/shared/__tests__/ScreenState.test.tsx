// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { Radio, ShieldCheck } from 'lucide-react';
import { afterEach, describe, expect, it } from 'vitest';
import { ScreenStateCard } from '../ScreenState';

afterEach(cleanup);

describe('ScreenStateCard', () => {
  it('owns the standard card surface for screen feedback', () => {
    const { container } = render(
      <ScreenStateCard
        icon={Radio}
        title="Waiting for monitor data"
        description="No readings yet."
      />,
    );

    const card = container.querySelector('.glass-card');
    expect(card).toBeTruthy();
    expect(card?.classList.contains('p-0!')).toBe(true);
    expect(screen.getByRole('heading', { name: 'Waiting for monitor data' })).toBeTruthy();
  });

  it('keeps the compact success treatment on a semantic section', () => {
    const { container } = render(
      <ScreenStateCard
        as="section"
        icon={ShieldCheck}
        title="System operating safely"
        description="No active alarms."
        tone="success"
        compact
      />,
    );

    const card = container.querySelector('section');
    expect(card?.classList.contains('border-dashed')).toBe(true);
    expect(screen.getByRole('heading', { name: 'System operating safely', level: 3 })).toBeTruthy();
  });
});
