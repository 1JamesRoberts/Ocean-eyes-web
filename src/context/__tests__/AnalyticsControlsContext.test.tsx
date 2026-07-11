// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import {
  AnalyticsControlsProvider,
  useAnalyticsControls,
} from '../AnalyticsControlsContext';

const mockFetch = vi.fn();
(globalThis as unknown as { fetch: typeof mockFetch }).fetch = mockFetch;

const jsonResponse = (body: unknown) => ({
  ok: true,
  json: async () => body,
});

const emptyHistory = (date: string) => ({ date, count: 0, records: [] });

const Probe = () => {
  const { range, isInitialLoading, detectionData } = useAnalyticsControls();
  return (
    <output data-testid="analytics-state">
      {`${range.startDate}|${isInitialLoading}|${detectionData?.count ?? 'pending'}`}
    </output>
  );
};

describe('AnalyticsControlsProvider', () => {
  const originalUrl = window.location.href;

  beforeEach(() => {
    mockFetch.mockReset();
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', originalUrl);
  });

  it('loads history only after applying the latest available date', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ dates: ['2026-07-03'], latest: '2026-07-03' }));
    mockFetch.mockResolvedValueOnce(jsonResponse(emptyHistory('2026-07-03')));
    mockFetch.mockResolvedValueOnce(jsonResponse(emptyHistory('2026-07-03')));

    render(
      <AnalyticsControlsProvider active>
        <Probe />
      </AnalyticsControlsProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('analytics-state').textContent).toBe('2026-07-03|false|0'));
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockFetch.mock.calls[0][0]).toContain('/history/available-dates');
    expect(mockFetch.mock.calls.slice(1).every(([url]) => String(url).includes('date=2026-07-03'))).toBe(true);
    expect(mockFetch.mock.calls.some(([url]) => String(url).includes('date=2026-07-11'))).toBe(false);
  });

  it('uses URL ranges immediately without requesting available dates', async () => {
    window.history.replaceState(null, '', '/?start=2026-06-01T00%3A00&end=2026-06-02T23%3A55');
    mockFetch.mockResolvedValueOnce(jsonResponse(emptyHistory('2026-06-01:2026-06-02')));
    mockFetch.mockResolvedValueOnce(jsonResponse(emptyHistory('2026-06-01:2026-06-02')));

    render(
      <AnalyticsControlsProvider active>
        <Probe />
      </AnalyticsControlsProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('analytics-state').textContent).toBe('2026-06-01|false|0'));
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls.every(([url]) => !String(url).includes('/history/available-dates'))).toBe(true);
    expect(mockFetch.mock.calls.every(([url]) => String(url).includes('start_date=2026-06-01'))).toBe(true);
  });
});
