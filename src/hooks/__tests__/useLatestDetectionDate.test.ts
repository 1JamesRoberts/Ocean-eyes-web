// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLatestDetectionDate } from '../useLatestDetectionDate';

const mockFetch = vi.fn();
(globalThis as unknown as { fetch: typeof mockFetch }).fetch = mockFetch;

describe('useLatestDetectionDate', () => {
  it('returns null, loading=true, and error when disabled', () => {
    const { result } = renderHook(() => useLatestDetectionDate(false));
    expect(result.current.latestDate).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetches and returns the latest date', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ dates: ['2026-06-17', '2026-07-03'], latest: '2026-07-03' }),
    });
    const { result } = renderHook(() => useLatestDetectionDate(true));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.latestDate).toBe('2026-07-03');
    expect(result.current.error).toBeNull();
  });

  it('returns error on failed fetch', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useLatestDetectionDate(true));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.latestDate).toBeNull();
    expect(result.current.error).toBe('Network error');
  });
});
