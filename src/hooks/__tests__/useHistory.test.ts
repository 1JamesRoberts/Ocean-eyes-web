// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useHistory } from '../useHistory';

const mockFetch = vi.fn();
(globalThis as unknown as { fetch: typeof mockFetch }).fetch = mockFetch;

const range = {
  startDate: '2026-07-05',
  endDate: '2026-07-05',
  startTime: '00:00',
  endTime: '23:55',
};

describe('useHistory', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('does nothing when disabled', () => {
    const { result } = renderHook(() => useHistory(range, false));
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.detectionData).toBeNull();
    expect(result.current.turbidityData).toBeNull();
    expect(result.current.isFallback).toBe(false);
  });

  it('fetches and returns detection and turbidity data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        date: '2026-07-05',
        count: 1,
        records: [
          {
            timestamp: '2026-07-05T10:00:00.000Z',
            image_dimensions: { width: 640, height: 480 },
            models: { detection: { provider: 'CUDAExecutionProvider' }, species: { provider: 'CUDAExecutionProvider' } },
            detections: [],
            summary: { total_detections: 0, species_counts: {} },
          },
        ],
      }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        date: '2026-07-05',
        count: 1,
        records: [
          {
            timestamp: '2026-07-05T10:00:00.000Z',
            image_dimensions: { width: 640, height: 480 },
            models: { turbidity: { provider: 'CUDAExecutionProvider' } },
            turbidity: { fnu: 0.1, top_class: 'clear', top_confidence: 0.95, all_probabilities: { clear: 0.95, cloudy: 0.05 } },
          },
        ],
      }),
    });

    const { result } = renderHook(() => useHistory(range, true));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.detectionData?.count).toBe(1);
    expect(result.current.turbidityData?.count).toBe(1);
    expect(result.current.error).toBeNull();
    expect(result.current.isFallback).toBe(false);
  });

  it('falls back to empty data on network error', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useHistory(range, true));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.detectionData?.records).toEqual([]);
    expect(result.current.turbidityData?.records).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.isFallback).toBe(true);
  });

  it('returns error on non-network fetch failure', async () => {
    mockFetch.mockRejectedValue(new Error('Some other error'));
    const { result } = renderHook(() => useHistory(range, true));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.detectionData).toBeNull();
    expect(result.current.turbidityData).toBeNull();
    expect(result.current.error).toBe('Some other error');
    expect(result.current.isFallback).toBe(false);
  });
});
