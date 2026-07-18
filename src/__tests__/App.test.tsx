// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const navigation = vi.hoisted(() => ({ activeTab: 'home' }));

vi.mock('../context/NavigationContext', () => ({
  NavigationProvider: ({ children }: { children: React.ReactNode }) => children,
  useNavigation: () => navigation,
}));

vi.mock('../context/LiveFeedContext', () => ({
  LiveFeedProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('../context/AnalyticsControlsContext', () => ({
  AnalyticsControlsProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('../components/shared', () => ({
  PhoneFrame: ({ children, navigation }: { children: React.ReactNode; navigation?: React.ReactNode }) => (
    <>{children}{navigation}</>
  ),
  PillNavigation: () => <nav aria-label="Dashboard navigation" />,
}));

vi.mock('../pages/ViewerApp', () => ({
  ViewerApp: () => <div data-mobile-screen-scroll />,
}));

vi.mock('../hooks/useTank', () => ({
  useTank: () => ({ tankId: 'tank-1' }),
}));

import App, { OceanEyesDashboard } from '../App';

beforeEach(() => {
  sessionStorage.clear();
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  navigation.activeTab = 'home';
  delete (HTMLElement.prototype as Partial<HTMLElement>).scrollTo;
  vi.restoreAllMocks();
});

describe('App mock authentication gate', () => {
  it('shows login without dashboard navigation, then hands off after mock sign-in', async () => {
    vi.useFakeTimers();
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Smart aquarium monitoring' })).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'Dashboard navigation' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    expect((screen.getByRole('button', { name: 'Connecting…' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toBe('Connecting to Google.');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(650);
    });

    expect(sessionStorage.getItem('oceaneyes_mock_google_authenticated')).toBe('true');
    expect(screen.getByRole('navigation', { name: 'Dashboard navigation' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Smart aquarium monitoring' })).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });

    expect(screen.queryByRole('heading', { name: 'Smart aquarium monitoring' })).toBeNull();
  });

  it('skips login when the browser session is already authenticated', () => {
    sessionStorage.setItem('oceaneyes_mock_google_authenticated', 'true');
    render(<App />);

    expect(screen.queryByRole('heading', { name: 'Smart aquarium monitoring' })).toBeNull();
    expect(screen.getByRole('navigation', { name: 'Dashboard navigation' })).toBeTruthy();
  });
});

describe('OceanEyesDashboard scrolling', () => {
  it('resets the stationary screen scroller when the active tab changes', () => {
    const scrollTo = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    });
    const { rerender } = render(<OceanEyesDashboard />);

    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0);

    navigation.activeTab = 'analytics';
    rerender(<OceanEyesDashboard />);

    expect(scrollTo).toHaveBeenCalledTimes(2);
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0);
  });
});
