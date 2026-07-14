// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ScreenHeader } from '../ScreenHeader';
import { ScreenWithHeroVideo } from '../ScreenWithHeroVideo';

afterEach(cleanup);

describe('ScreenWithHeroVideo stationary scroller', () => {
  it('renders the surface and content spacer without a blend when the hero is visible', () => {
    const { container } = render(
      <ScreenWithHeroVideo hero={<div>Live video</div>}>
        <div>Screen content</div>
      </ScreenWithHeroVideo>,
    );

    expect(container.querySelector('.mobile-hero-blend')).toBeNull();
    expect(container.querySelector('.mobile-hero-media')).not.toBeNull();
    expect(container.querySelector('.mobile-hero-surface')).not.toBeNull();
    const scrollContainer = container.querySelector<HTMLElement>('[data-mobile-screen-scroll]');
    expect(scrollContainer?.classList.contains('overflow-y-auto')).toBe(true);
    expect(scrollContainer?.classList.contains('mobile-hero-content-clip')).toBe(true);
    expect(scrollContainer?.classList.contains('mobile-hero-content-mask')).toBe(false);
    expect(scrollContainer?.classList.contains('bg-transparent')).toBe(true);
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
    const scrollContainer = container.querySelector<HTMLElement>('[data-mobile-screen-scroll]');
    expect(scrollContainer?.classList.contains('mobile-hero-content-clip')).toBe(false);
    expect(scrollContainer?.classList.contains('bg-gradient-mint')).toBe(true);
    expect(container.querySelector('[data-mobile-hero-content-spacer]')).toBeNull();
  });

  it('keeps the hard clip stationary during large and repeated scroll jumps', () => {
    const { container } = render(
      <div className="phone-content">
        <ScreenWithHeroVideo hero={<div>Live video</div>}>
          <ScreenHeader eyebrow="Aquarium overview" />
          <div>Card content</div>
        </ScreenWithHeroVideo>
      </div>,
    );

    const scrollContainer = container.querySelector<HTMLElement>('[data-mobile-screen-scroll]');

    expect(scrollContainer).not.toBeNull();
    expect(scrollContainer!.classList.contains('mobile-hero-content-clip')).toBe(true);
    expect(scrollContainer!.classList.contains('mobile-hero-content-mask')).toBe(false);
    expect(scrollContainer!.style.getPropertyValue('--mobile-hero-content-clip-start')).toBe('');

    scrollContainer!.scrollTop = 1_000;
    for (let index = 0; index < 10; index += 1) {
      fireEvent.scroll(scrollContainer!);
    }

    expect(scrollContainer!.scrollTop).toBe(1_000);
    expect(scrollContainer!.classList.contains('mobile-hero-content-clip')).toBe(true);
    expect(scrollContainer!.classList.contains('mobile-hero-content-mask')).toBe(false);
    expect(scrollContainer!.style.getPropertyValue('--mobile-hero-content-clip-start')).toBe('');
  });
});
