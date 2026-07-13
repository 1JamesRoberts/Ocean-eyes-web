// @vitest-environment jsdom
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

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
  PhoneFrame: ({ children }: { children: React.ReactNode }) => children,
  PillNavigation: () => null,
}));

vi.mock('../pages/ViewerApp', () => ({
  ViewerApp: () => <div data-mobile-screen-scroll />,
}));

vi.mock('../hooks/useTank', () => ({
  useTank: () => ({ tankId: 'tank-1' }),
}));

import { OceanEyesDashboard } from '../App';

afterEach(() => {
  cleanup();
  navigation.activeTab = 'home';
  delete (HTMLElement.prototype as Partial<HTMLElement>).scrollTo;
  vi.restoreAllMocks();
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
