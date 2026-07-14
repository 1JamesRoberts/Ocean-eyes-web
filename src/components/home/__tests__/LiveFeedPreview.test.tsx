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

describe('LiveFeedPreview notification button', () => {
  const onViewAdvanced = vi.fn();
  const onOpenAlerts = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  const renderHero = (showNotifications: boolean) => render(
    <LiveFeedPreview
      displayClarity={0}
      displayFishCount={0}
      onViewAdvanced={onViewAdvanced}
      onOpenAlerts={onOpenAlerts}
      showNotifications={showNotifications}
      hero
    />,
  );

  it('shows an accessible icon-only notification button on the Dashboard hero', () => {
    renderHero(true);

    const button = screen.getByRole('button', { name: 'Open notifications' });

    expect(button).toBeTruthy();
    expect(button.querySelector('svg')?.classList.contains('size-4.5!')).toBe(true);
  });

  it('opens alerts without triggering the hero navigation', () => {
    renderHero(true);

    fireEvent.click(screen.getByRole('button', { name: 'Open notifications' }));

    expect(onOpenAlerts).toHaveBeenCalledOnce();
    expect(onViewAdvanced).not.toHaveBeenCalled();
  });

  it('hides the notification button outside the Dashboard', () => {
    renderHero(false);

    expect(screen.queryByRole('button', { name: 'Open notifications' })).toBeNull();
  });
});
