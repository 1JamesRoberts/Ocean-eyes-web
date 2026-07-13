// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ScreenHeader } from '../ScreenHeader';
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
    expect(container.querySelector('[data-mobile-hero-masked-content]')?.classList.contains('mobile-hero-content-mask')).toBe(true);
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
    expect(container.querySelector('[data-mobile-hero-masked-content]')?.classList.contains('mobile-hero-content-mask')).toBe(false);
    expect(container.querySelector('[data-mobile-hero-scroll-layer]')?.classList.contains('bg-gradient-mint')).toBe(true);
    expect(container.querySelector('[data-mobile-hero-content-spacer]')).toBeNull();
  });

  it('finishes fading the complete content subtree below the heading', async () => {
    const { container, getByRole } = render(
      <div className="phone-content">
        <ScreenWithHeroVideo hero={<div>Live video</div>}>
          <ScreenHeader eyebrow="Aquarium overview" />
          <div>Card content</div>
        </ScreenWithHeroVideo>
      </div>,
    );

    const heading = getByRole('heading', { name: 'Aquarium overview' });
    const maskedContent = container.querySelector<HTMLElement>('[data-mobile-hero-masked-content]');
    const scrollContainer = container.querySelector<HTMLElement>('.phone-content');

    expect(maskedContent).not.toBeNull();
    expect(scrollContainer).not.toBeNull();

    maskedContent!.getBoundingClientRect = () => ({ top: 40 }) as DOMRect;
    heading.getBoundingClientRect = () => ({ bottom: 116 }) as DOMRect;
    fireEvent.scroll(scrollContainer!);

    await waitFor(() => {
      expect(maskedContent!.style.getPropertyValue('--mobile-hero-content-mask-start')).toBe('84px');
      expect(maskedContent!.style.getPropertyValue('--mobile-hero-content-mask-end')).toBe('96px');
    });
  });
});
