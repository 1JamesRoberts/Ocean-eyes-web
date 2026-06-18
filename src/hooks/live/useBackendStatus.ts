import { useState, useEffect, useCallback } from 'react';
import { isBackendAvailable } from '../../services/ai_service';

export type BackendStatus = 'unknown' | 'checking' | 'online' | 'offline';

export interface UseBackendStatusResult {
  backendStatus: BackendStatus;
  checkBackend: (signal?: AbortSignal) => Promise<boolean>;
}

const HEALTH_CHECK_INTERVAL_MS = 30_000;

export const useBackendStatus = (isStreaming: boolean): UseBackendStatusResult => {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('unknown');

  useEffect(() => {
    if (!isStreaming) return;

    const check = async () => {
      const ok = await isBackendAvailable();
      setBackendStatus((prev) => (prev === 'checking' ? prev : ok ? 'online' : 'offline'));
    };

    check();
    const interval = setInterval(check, HEALTH_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isStreaming]);

  const checkBackend = useCallback(
    async (signal?: AbortSignal): Promise<boolean> => {
      if (backendStatus === 'online') return true;

      setBackendStatus('checking');
      const ok = await isBackendAvailable(signal);
      setBackendStatus(ok ? 'online' : 'offline');
      return ok;
    },
    [backendStatus]
  );

  return { backendStatus, checkBackend };
};
