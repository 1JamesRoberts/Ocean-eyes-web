// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AmbientVideoBackdrop } from '../AmbientVideoBackdrop';
import { HeroMediaLayerContext } from '../HeroActionLayerContext';

const liveFeedState = vi.hoisted(() => ({ isStreaming: false }));

vi.mock('../../../hooks/useLiveFeed', () => ({
  useLiveFeed: () => ({
    isStreaming: liveFeedState.isStreaming,
  }),
}));

const createSourceVideo = () => {
  const video = document.createElement('video');
  Object.defineProperties(video, {
    readyState: { configurable: true, value: HTMLMediaElement.HAVE_CURRENT_DATA },
    videoWidth: { configurable: true, value: 1_000 },
    videoHeight: { configurable: true, value: 500 },
  });
  return video;
};

describe('AmbientVideoBackdrop', () => {
  const clearRect = vi.fn();
  const drawImage = vi.fn();
  let documentHidden = false;

  beforeEach(() => {
    liveFeedState.isStreaming = false;
    documentHidden = false;
    clearRect.mockClear();
    drawImage.mockClear();
    vi.useFakeTimers();
    vi.spyOn(document, 'hidden', 'get').mockImplementation(() => documentHidden);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      clearRect,
      drawImage,
    } as unknown as CanvasRenderingContext2D);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('uses the charcoal fallback without a sample while the stream is idle', () => {
    const { container } = render(<AmbientVideoBackdrop />);

    expect(container.querySelector('[data-ambient-video-backdrop]')).not.toBeNull();
    expect(container.querySelector('[data-ambient-video-sample]')).toBeNull();
    expect(container.querySelector('video')).toBeNull();
  });

  it('samples the bottom 15% into a 64 by 16 canvas every ten seconds', () => {
    liveFeedState.isStreaming = true;
    const sourceVideo = createSourceVideo();
    const mediaLayer = document.createElement('div');
    mediaLayer.append(sourceVideo);

    const { container, unmount } = render(
      <HeroMediaLayerContext.Provider value={mediaLayer}>
        <AmbientVideoBackdrop
          filters={{
            contrast: 105,
            brightness: 95,
            saturation: 110,
            temperature: -5,
            tint: 15,
          }}
          temperatureOverlay={{ backgroundColor: '#00a0ff', opacity: 0.1 }}
          tintOverlay={{ backgroundColor: '#ff00bb', opacity: 0.2 }}
        />
      </HeroMediaLayerContext.Provider>,
    );

    const sample = container.querySelector<HTMLCanvasElement>(
      '[data-ambient-video-sample]',
    );
    expect(sample?.width).toBe(64);
    expect(sample?.height).toBe(16);
    expect(sample?.style.filter).toBe(
      'contrast(105%) brightness(95%) saturate(110%)',
    );
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelectorAll('.mix-blend-color')).toHaveLength(2);
    expect(drawImage).toHaveBeenCalledWith(
      sourceVideo,
      0,
      425,
      1_000,
      75,
      0,
      0,
      64,
      16,
    );

    act(() => vi.advanceTimersByTime(10_000));
    expect(drawImage).toHaveBeenCalledTimes(2);

    unmount();
    act(() => vi.advanceTimersByTime(20_000));
    sourceVideo.dispatchEvent(new Event('loadeddata'));
    expect(drawImage).toHaveBeenCalledTimes(2);
  });

  it('pauses sampling while hidden and refreshes when visible again', () => {
    liveFeedState.isStreaming = true;
    const sourceVideo = createSourceVideo();
    const mediaLayer = document.createElement('div');
    mediaLayer.append(sourceVideo);

    render(
      <HeroMediaLayerContext.Provider value={mediaLayer}>
        <AmbientVideoBackdrop />
      </HeroMediaLayerContext.Provider>,
    );
    expect(drawImage).toHaveBeenCalledTimes(1);

    documentHidden = true;
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    act(() => vi.advanceTimersByTime(20_000));
    expect(drawImage).toHaveBeenCalledTimes(1);

    documentHidden = false;
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(drawImage).toHaveBeenCalledTimes(2);
  });
});
