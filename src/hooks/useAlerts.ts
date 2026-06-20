import { useSyncExternalStore } from 'react';
import {
  getAlerts,
  addAlert as addAlertToRepository,
  resolveAlert as resolveAlertInRepository,
  subscribeAlerts,
} from '../models/repositories/storageBase';
import type { AlertItem } from '../types/aquarium';

const EMPTY_ALERTS: AlertItem[] = [];

export const useAlerts = () => {
  const alerts = useSyncExternalStore<AlertItem[]>(
    subscribeAlerts,
    () => getAlerts(),
    () => EMPTY_ALERTS
  );

  const addAlert = (alert: AlertItem) => {
    addAlertToRepository(alert);
  };

  const resolveAlert = (alertId: string) => {
    resolveAlertInRepository(alertId);
  };

  return {
    alerts,
    addAlert,
    resolveAlert,
  };
};
