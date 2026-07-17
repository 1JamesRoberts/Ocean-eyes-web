// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FishMotionScene } from '../../../models/services/fishMotionScene';
import { useFishMotionCanvas } from '../useFishMotionCanvas';

const context = {
  clearRect: vi.fn(),
  drawImage: vi.fn(),
  restore: vi.fn(),
  rotate: vi.fn(),
  save: vi.fn(),
  scale: vi.fn(),
  setTransform: vi.fn(),
  translate: vi.fn(),
  globalAlpha: 1,
  imageSmoothingEnabled: true,
  imageSmoothingQuality: 'high',
} as unknown as CanvasRenderingContext2D;

let mediaQueryMatches = false;
const addMediaListener = vi.fn();
const removeMediaListener = vi.fn();
const disconnectResizeObserver = vi.fn();
const observeResize = vi.fn();
let addDocumentListener: ReturnType<typeof vi.spyOn>;
let removeDocumentListener: ReturnType<typeof vi.spyOn>;

class MockResizeObserver {
  observe = observeResize;
  disconnect = disconnectResizeObserver;
}

class MockImage {
  decoding = '';
  naturalHeight = 512;
  naturalWidth = 512;
  onerror: (() => void) | null = null;
  onload: (() => void) | null = null;

  set src(value: string) {
    queueMicrotask(() => {
      if (value.includes('failure')) this.onerror?.();
      else this.onload?.();
    });
  }
}

function scene(imagePath: string): FishMotionScene {
  return {
    overflowCount: 0,
    unsupportedCount: 0,
    swimmers: [{
      key: 'fish-1:0',
      speciesId: 'guppy',
      imagePath,
      lane: 'middle',
      motion: {
        pathSeed: 127.5,
        initialDirection: 1,
        cruiseSpeed: 9,
        timelineOffset: 0.5,
        verticalSpan: 0.23,
        reversalInterval: 7,
        reversalOffset: 2,
      },
      lengthCm: 10,
      bodyPhase: 0,
      depth: 0.5,
    }],
  };
}

function Harness({ value }: { value: FishMotionScene }) {
  const { canvasRef, failedFishCount } = useFishMotionCanvas({
    active: true,
    scene: value,
  });
  return (
    <>
      <canvas ref={canvasRef} />
      <output>{failedFishCount}</output>
    </>
  );
}

async function flushImages() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  mediaQueryMatches = false;
  vi.clearAllMocks();
  vi.stubGlobal('Image', MockImage);
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 41));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: mediaQueryMatches,
    addEventListener: addMediaListener,
    removeEventListener: removeMediaListener,
  })));
  addDocumentListener = vi.spyOn(document, 'addEventListener');
  removeDocumentListener = vi.spyOn(document, 'removeEventListener');
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 393,
    height: 221,
    top: 0,
    right: 393,
    bottom: 221,
    left: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useFishMotionCanvas', () => {
  it('caps high-density canvas rendering at 2x', async () => {
    vi.stubGlobal('devicePixelRatio', 3);
    const { container } = render(<Harness value={scene('/success-hook-density.png')} />);
    await flushImages();

    const canvas = container.querySelector('canvas');
    expect(canvas?.width).toBe(786);
    expect(canvas?.height).toBe(442);
    expect(context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
  });

  it('starts one loop and cleans up animation, resize, and media listeners', async () => {
    const { unmount } = render(<Harness value={scene('/success-hook-lifecycle.png')} />);
    await flushImages();

    expect(requestAnimationFrame).toHaveBeenCalledOnce();
    expect(observeResize).toHaveBeenCalledOnce();
    expect(addMediaListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(addDocumentListener).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function),
    );

    unmount();

    expect(cancelAnimationFrame).toHaveBeenCalledWith(41);
    expect(disconnectResizeObserver).toHaveBeenCalledOnce();
    expect(removeMediaListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(removeDocumentListener).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function),
    );
  });

  it('draws one still frame instead of scheduling animation for reduced motion', async () => {
    mediaQueryMatches = true;
    render(<Harness value={scene('/success-hook-reduced.png')} />);
    await flushImages();

    expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(context.clearRect).toHaveBeenCalled();
  });

  it('reports failed sprite loads without starting the frame loop', async () => {
    render(<Harness value={scene('/failure-hook.png')} />);
    await flushImages();

    expect(screen.getByText('1')).toBeTruthy();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(context.clearRect).toHaveBeenCalled();
    expect(context.drawImage).not.toHaveBeenCalled();
  });
});
