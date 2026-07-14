// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { Bell } from 'lucide-react';
import { afterEach, describe, expect, it } from 'vitest';
import { HeadedCard } from '../HeadedCard';

afterEach(cleanup);

describe('HeadedCard', () => {
  it('owns the standard card inset and heading content', () => {
    const { container } = render(
      <HeadedCard
        as="section"
        icon={Bell}
        title="Alerts"
        action={<button type="button">Open</button>}
      >
        <p>Card content</p>
      </HeadedCard>,
    );

    const card = container.querySelector('section');
    expect(card).toBeTruthy();
    expect(card?.classList.contains('glass-card')).toBe(true);
    expect(card?.classList.contains('px-5!')).toBe(true);
    expect(card?.classList.contains('pt-4.5!')).toBe(true);
    expect(card?.classList.contains('pb-4!')).toBe(true);
    expect(screen.getByRole('heading', { name: 'Alerts' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open' })).toBeTruthy();
  });

  it('supports the edge-to-edge media header variant', () => {
    render(
      <HeadedCard
        icon="videocam"
        title="Live Feed Monitor"
        headerVariant="edge"
      >
        <p>Video</p>
      </HeadedCard>,
    );

    const card = screen.getByText('Video').parentElement;
    expect(card?.classList.contains('p-0!')).toBe(true);
    expect(card?.classList.contains('overflow-hidden')).toBe(true);
  });
});
