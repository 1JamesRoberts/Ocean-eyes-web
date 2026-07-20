// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CSSProperties } from 'react';
import { ScreenHeader } from '../ScreenHeader';
import { ScreenWithHeroVideo } from '../ScreenWithHeroVideo';
import { useHeroMediaLayer } from '../HeroActionLayerContext';

vi.mock('../../../hooks/useLiveFeed', () => ({
  useLiveFeed: () => ({ isStreaming: false }),
}));

const HeroMediaLayerProbe = () => {
  const mediaLayer = useHeroMediaLayer();
  return <span data-testid="media-layer-class">{mediaLayer?.className}</span>;
};

afterEach(cleanup);

describe('ScreenWithHeroVideo stationary scroller', () => {
  it('renders the rounded content clip, ambient backdrop, and spacer when the hero is visible', () => {
    const { container } = render(
      <ScreenWithHeroVideo hero={<div>Live video</div>} ambientVideo={{}}>
        <div>Screen content</div>
      </ScreenWithHeroVideo>,
    );

    expect(container.querySelector('.mobile-hero-blend')).toBeNull();
    expect(container.querySelector('.mobile-hero-media')).not.toBeNull();
    expect(container.querySelector('.mobile-hero-surface')).toBeNull();
    expect(container.querySelector('[data-ambient-video-backdrop]')).not.toBeNull();
    const scrollContainer = container.querySelector<HTMLElement>('[data-mobile-screen-scroll]');
    expect(scrollContainer?.classList.contains('overflow-y-auto')).toBe(true);
    // The shared utility owns the stationary cutoff and its rounded top corners.
    expect(scrollContainer?.classList.contains('mobile-hero-content-clip')).toBe(true);
    expect(scrollContainer?.classList.contains('mobile-hero-content-mask')).toBe(false);
    expect(scrollContainer?.classList.contains('bg-transparent')).toBe(true);
    expect(container.querySelector('[data-mobile-hero-content-spacer]')).not.toBeNull();
    const bottomSpacer = container.querySelector<HTMLElement>('[data-mobile-screen-bottom-spacer]');
    expect(bottomSpacer?.classList.contains('h-[var(--mobile-bottom-navigation-clearance)]')).toBe(true);
    expect(bottomSpacer?.getAttribute('aria-hidden')).toBe('true');
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
    expect(container.querySelector('[data-ambient-video-backdrop]')).toBeNull();
    const scrollContainer = container.querySelector<HTMLElement>('[data-mobile-screen-scroll]');
    expect(scrollContainer?.classList.contains('mobile-hero-content-clip')).toBe(false);
    expect(scrollContainer?.classList.contains('bg-gradient-mint')).toBe(true);
    expect(container.querySelector('[data-mobile-hero-content-spacer]')).toBeNull();
    expect(container.querySelector('[data-mobile-screen-bottom-spacer]')).not.toBeNull();
  });

  it('exposes the full media layer as the target for video-bound overlays', () => {
    const { getByTestId } = render(
      <ScreenWithHeroVideo hero={<div>Live video</div>}>
        <HeroMediaLayerProbe />
      </ScreenWithHeroVideo>,
    );

    expect(getByTestId('media-layer-class').textContent).toContain('mobile-hero-media');
  });

  it('applies inherited canvas debug variables without changing transition classes', () => {
    const canvasStyle = {
      '--mobile-canvas-background': 'rgb(186 186 186)',
      '--mobile-ambient-opacity': '0.6',
      '--mobile-ambient-blur': '30px',
      '--mobile-ambient-fade-start': '24%',
      '--mobile-ambient-fade-end': '88%',
    } as CSSProperties;
    const { container } = render(
      <ScreenWithHeroVideo
        hero={<div>Live video</div>}
        ambientVideo={{ canvasStyle }}
      >
        <div>Screen content</div>
      </ScreenWithHeroVideo>,
    );

    const shell = container.querySelector<HTMLElement>('.bg-gradient-mint');
    expect(shell?.style.getPropertyValue('--mobile-canvas-background')).toBe(
      'rgb(186 186 186)',
    );
    expect(shell?.style.getPropertyValue('--mobile-ambient-opacity')).toBe('0.6');
    expect(container.querySelector('.mobile-ambient-backdrop')).not.toBeNull();
    expect(container.querySelector('.mobile-hero-content-clip')).not.toBeNull();
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
