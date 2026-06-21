import { useState, useEffect, useCallback } from 'react';
import { isBackendAvailable } from '../../models/api/aiApi';
import { BACKEND_HEALTH_CHECK_INTERVAL_MS } from '../../utils/constants';

export type BackendStatus = 'unknown' | 'checking' | 'online' | 'offline';

export interface UseBackendStatusViewModelResult {
  backendStatus: BackendStatus;
  checkBackend: (signal?: AbortSignal) => Promise<boolean>;
}

export const useBackendStatus = (isStreaming: boolean): UseBackendStatusViewModelResult => {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('unknown');

  useEffect(() => {
    if (!isStreaming) return;

    const check = async () => {
      const ok = await isBackendAvailable();
      setBackendStatus((prev) => (prev === 'checking' ? prev : ok ? 'online' : 'offline'));
    };

    check();
    const interval = setInterval(check, BACKEND_HEALTH_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isStreaming]);

  const checkBackend = useCallback(
    async (signal?: AbortSignal): Promise<boolean> => {
      setBackendStatus('checking');
      const ok = await isBackendAvailable(signal);
      setBackendStatus(ok ? 'online' : 'offline');
      return ok;
    },
    [backendStatus]
  );

  return { backendStatus, checkBackend };
};
