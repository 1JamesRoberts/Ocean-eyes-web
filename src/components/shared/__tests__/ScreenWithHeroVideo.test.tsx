// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ScreenWithHeroVideo } from '../ScreenWithHeroVideo';

afterEach(cleanup);

describe('ScreenWithHeroVideo transition', () => {
  it('renders the blend and content spacer when the hero is visible', () => {
    const { container } = render(
      <ScreenWithHeroVideo hero={<div>Live video</div>}>
        <div>Screen content</div>
      </ScreenWithHeroVideo>,
    );

    expect(container.querySelector('.mobile-hero-blend')).not.toBeNull();
    expect(container.querySelector('.mobile-hero-media')).not.toBeNull();
    expect(container.querySelector('.mobile-hero-surface')).not.toBeNull();
    expect(container.querySelector('[data-mobile-hero-scroll-layer]')?.classList.contains('bg-transparent')).toBe(true);
    expect(container.querySelector('[data-mobile-hero-content-spacer]')).not.toBeNull();
  });

  it('keeps the hero mounted without rendering its transition when hidden', () => {
    const { container, getByText } = render(
      <ScreenWithHeroVideo hero={<div>Live video</div>} showHero={false}>
        <div>Screen content</div>
      </ScreenWithHeroVideo>,
    );

    expect(getByText('Live video')).toBeTruthy();
    expect(container.querySelector('.mobile-hero-video')?.classList.contains('hidden')).toBe(true);
    expect(container.querySelector('.mobile-hero-blend')).toBeNull();
    expect(container.querySelector('.mobile-hero-media')).not.toBeNull();
    expect(container.querySelector('.mobile-hero-surface')).toBeNull();
    expect(container.querySelector('[data-mobile-hero-scroll-layer]')?.classList.contains('bg-gradient-mint')).toBe(true);
    expect(container.querySelector('[data-mobile-hero-content-spacer]')).toBeNull();
  });
});
