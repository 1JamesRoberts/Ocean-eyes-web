// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AmbientVideoBackdrop } from '../AmbientVideoBackdrop';

const liveFeedState = vi.hoisted(() => ({ isStreaming: false }));

vi.mock('../../../hooks/useLiveFeed', () => ({
  useLiveFeed: () => ({
    activeFeed: undefined,
    isWebcam: false,
    isStreaming: liveFeedState.isStreaming,
    videoRef: { current: null },
  }),
}));

describe('AmbientVideoBackdrop', () => {
  beforeEach(() => {
    liveFeedState.isStreaming = false;
  });

  afterEach(() => {
    cleanup();
  });

  it('uses the aquatic fallback while the stream is idle', () => {
    const { container } = render(<AmbientVideoBackdrop />);

    expect(container.querySelector('[data-ambient-video-backdrop]')).not.toBeNull();
    expect(container.querySelector('video')).toBeNull();
  });

  it('mirrors the live camera adjustments without capturing frames', () => {
    liveFeedState.isStreaming = true;
    const { container } = render(
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
      />,
    );

    expect(container.querySelector('video')?.style.filter).toBe(
      'contrast(105%) brightness(95%) saturate(110%)',
    );
    expect(container.querySelectorAll('.mix-blend-color')).toHaveLength(2);
  });
});
