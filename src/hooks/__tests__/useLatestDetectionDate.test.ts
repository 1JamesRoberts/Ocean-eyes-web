// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLatestDetectionDate } from '../useLatestDetectionDate';

const mockFetch = vi.fn();
(globalThis as unknown as { fetch: typeof mockFetch }).fetch = mockFetch;

describe('useLatestDetectionDate', () => {
  it('returns null, loading=false, and error when disabled', () => {
    const { result } = renderHook(() => useLatestDetectionDate(false));
    expect(result.current.latestDate).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isFallback).toBe(false);
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
    expect(result.current.isFallback).toBe(false);
  });

  it('falls back to today on network error', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useLatestDetectionDate(true));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.latestDate).not.toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isFallback).toBe(true);
  });

  it('returns error on non-network fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Unexpected parser failure'));
    const { result } = renderHook(() => useLatestDetectionDate(true));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.latestDate).toBeNull();
    expect(result.current.error).toBe('Unexpected parser failure');
    expect(result.current.isFallback).toBe(false);
  });
});
