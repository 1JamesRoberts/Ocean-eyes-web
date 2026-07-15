// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveFeedPreview } from '../LiveFeedPreview';

vi.mock('../../../hooks/useLiveFeed', () => ({
  useLiveFeed: () => ({
    activeFeed: undefined,
    isWebcam: false,
    isStreaming: false,
    videoRef: { current: null },
    startStream: vi.fn(),
  }),
}));

describe('LiveFeedPreview hero', () => {
  const onViewAdvanced = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
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
});
