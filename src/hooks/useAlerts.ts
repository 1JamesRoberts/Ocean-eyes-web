import { useSyncExternalStore } from 'react';
import { LocalStorageStore, subscribe } from '../services/localStorageStore';
import type { AlertItem } from '../types/aquarium';

const EMPTY_ALERTS: AlertItem[] = [];

const subscribeAlerts = (callback: () => void) => subscribe('alerts', callback);

export const useAlerts = () => {
  const alerts = useSyncExternalStore<AlertItem[]>(
    subscribeAlerts,
    () => LocalStorageStore.getSnapshot('alerts', EMPTY_ALERTS),
    () => EMPTY_ALERTS
  );

  const addAlert = (alert: AlertItem) => {
    LocalStorageStore.saveAlerts([alert, ...LocalStorageStore.getAlerts()]);
  };

  const resolveAlert = (alertId: string) => {
    LocalStorageStore.resolveAlert(alertId);
  };

  return {
    alerts,
    addAlert,
    resolveAlert,
  };
};
