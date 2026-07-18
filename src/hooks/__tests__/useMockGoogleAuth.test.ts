// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMockGoogleAuth } from '../useMockGoogleAuth';

beforeEach(() => {
  sessionStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useMockGoogleAuth', () => {
  it('authenticates the mounted app even when session storage cannot be written', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable');
    });
    const { result } = renderHook(() => useMockGoogleAuth());

    act(() => {
      void result.current.signInWithGoogle();
    });
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(650);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });
});
