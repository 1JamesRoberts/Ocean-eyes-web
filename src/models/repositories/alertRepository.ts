// alertRepository.ts - Alert CRUD
import type { AlertItem } from '../../types/aquarium';
import {
  STORAGE_KEYS,
  getOrDefault,
  safeSetItem,
  notifyUpdate,
  subscribeToDb,
} from './storageBase';

export const getAlerts = (): AlertItem[] =>
  getOrDefault<AlertItem[]>(STORAGE_KEYS.alerts, []);

export const saveAlerts = (alerts: AlertItem[]) => {
  const result = safeSetItem(STORAGE_KEYS.alerts, JSON.stringify(alerts));
  if (result.success) notifyUpdate(STORAGE_KEYS.alerts);
  return result;
};

export const addAlert = (alert: AlertItem) => {
  saveAlerts([alert, ...getAlerts()]);
};

export const resolveAlert = (alertId: string) => {
  const alerts = getAlerts();
  const index = alerts.findIndex((a) => a.id === alertId);
  if (index !== -1) {
    alerts[index].resolved = true;
    saveAlerts(alerts);
  }
};

export const subscribeAlerts = (callback: () => void) =>
  subscribeToDb(STORAGE_KEYS.alerts, callback);
