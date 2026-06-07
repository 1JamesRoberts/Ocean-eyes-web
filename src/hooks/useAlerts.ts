/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { MockFirestore, subscribeToDb } from '../services/mock_service';
import type { AlertItem } from '../types/aquarium';

export const useAlerts = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>(() => MockFirestore.getAlerts());

  const syncAlerts = () => {
    setAlerts(MockFirestore.getAlerts());
  };

  useEffect(() => {
    syncAlerts();
    return subscribeToDb(syncAlerts);
  }, []);

  const resolveAlert = (alertId: string) => {
    MockFirestore.resolveAlert(alertId);
  };

  return {
    alerts,
    setAlerts,
    resolveAlert,
  };
};
