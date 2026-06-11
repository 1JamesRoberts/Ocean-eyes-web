/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { LocalStorageStore, subscribeToDb } from '../services/localStorageStore';
import type { AlertItem } from '../types/aquarium';

export const useAlerts = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>(() => LocalStorageStore.getAlerts());

  const syncAlerts = () => {
    setAlerts(LocalStorageStore.getAlerts());
  };

  useEffect(() => {
    syncAlerts();
    return subscribeToDb(syncAlerts);
  }, []);

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
