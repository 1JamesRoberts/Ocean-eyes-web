// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ScreenWithHeroVideo } from '../../shared/ScreenWithHeroVideo';
import type { FishEntry } from '../../../types/aquarium';
import { FishInventoryHeroOverlay } from '../FishInventoryHeroOverlay';

const hookState = vi.hoisted(() => ({ failedFishCount: 0 }));

vi.mock('../../../hooks/fish/useFishMotionCanvas', () => ({
  useFishMotionCanvas: () => ({
    canvasRef: { current: null },
    failedFishCount: hookState.failedFishCount,
  }),
}));

afterEach(() => {
  hookState.failedFishCount = 0;
  cleanup();
});

function fish(id: string, speciesId: string, count: number): FishEntry {
  return {
    id,
    tankId: 'tank-1',
    speciesId,
    name: speciesId,
    imageUrl: '',
    count,
    detected: 0,
  };
}

function renderOverlay(fishList: FishEntry[]) {
  return render(
    <ScreenWithHeroVideo hero={<div>Live video</div>}>
      <FishInventoryHeroOverlay fishList={fishList} />
    </ScreenWithHeroVideo>,
  );
}

describe('FishInventoryHeroOverlay', () => {
  it('portals a decorative, pointer-transparent canvas into the hero media layer', () => {
    const { container } = renderOverlay([fish('guppy-1', 'guppy', 2)]);

    const mediaLayer = container.querySelector('.mobile-hero-media');
    const overlay = mediaLayer?.querySelector('[data-fish-motion-overlay]');
    expect(overlay).not.toBeNull();
    expect(overlay?.classList.contains('pointer-events-none')).toBe(true);
    expect(overlay?.getAttribute('aria-hidden')).toBe('true');
    expect(overlay?.querySelector('[data-fish-motion-canvas]')).not.toBeNull();
  });

  it('shows unsupported and failed artwork without a capped-fish pill', () => {
    hookState.failedFishCount = 1;
    renderOverlay([
      fish('guppy-1', 'guppy', 14),
      fish('custom-1', 'moonlight_minnow', 2),
    ]);

    expect(screen.queryByText('+2 more')).toBeNull();
    expect(screen.getByText('3 awaiting art')).toBeTruthy();
  });

  it('leaves an empty inventory hero unchanged', () => {
    const { container } = renderOverlay([]);

    expect(container.querySelector('[data-fish-motion-overlay]')).toBeNull();
  });
});
