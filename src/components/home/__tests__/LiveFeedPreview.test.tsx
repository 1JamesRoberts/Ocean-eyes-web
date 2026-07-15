// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveFeedPreview } from '../LiveFeedPreview';

const liveFeedState = vi.hoisted(() => ({ isStreaming: false }));

vi.mock('../../../hooks/useLiveFeed', () => ({
  useLiveFeed: () => ({
    activeFeed: undefined,
    isWebcam: false,
    isStreaming: liveFeedState.isStreaming,
    videoRef: { current: null },
    startStream: vi.fn(),
  }),
}));

describe('LiveFeedPreview hero', () => {
  const onViewAdvanced = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    liveFeedState.isStreaming = false;
  });

  afterEach(cleanup);

  const renderHero = () => render(
    <LiveFeedPreview
      displayClarity={0}
      displayFishCount={0}
      onViewAdvanced={onViewAdvanced}
      hero
    />,
  );

  it('offers to connect the camera when the feed is idle', () => {
    renderHero();

    expect(screen.getByRole('button', { name: 'Connect Stream' })).toBeTruthy();
  });

  it('opens the advanced live view when the hero is selected', () => {
    renderHero();

    fireEvent.click(screen.getByText('Feed is idle. Connect stream to monitor.'));

    expect(onViewAdvanced).toHaveBeenCalledOnce();
  });

  it('does not open the advanced view when connecting the stream', () => {
    renderHero();

    fireEvent.click(screen.getByRole('button', { name: 'Connect Stream' }));

    expect(onViewAdvanced).not.toHaveBeenCalled();
  });

  it('applies the shared image adjustments and color overlays to the hero video', () => {
    liveFeedState.isStreaming = true;

    const { container } = render(
      <LiveFeedPreview
        displayClarity={0}
        displayFishCount={0}
        onViewAdvanced={onViewAdvanced}
        filters={{
          contrast: 105,
          brightness: 95,
          saturation: 110,
          temperature: -5,
          tint: 15,
        }}
        temperatureOverlay={{ backgroundColor: '#00a0ff', opacity: 0.1 }}
        tintOverlay={{ backgroundColor: '#ff00bb', opacity: 0.2 }}
        hero
      />,
    );

    expect(container.querySelector('video')?.style.filter).toBe(
      'contrast(105%) brightness(95%) saturate(110%)',
    );
    expect(container.querySelectorAll('.mix-blend-color')).toHaveLength(2);
  });
});
