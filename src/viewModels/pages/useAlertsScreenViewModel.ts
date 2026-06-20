import { useMemo, useCallback } from 'react';
import { useAlertsViewModel } from '../useAlertsViewModel';
import { useNavigationViewModel } from '../useNavigationViewModel';

export const useAlertsScreenViewModel = () => {
  const { setActiveTab, selectedAlertId, setSelectedAlertId } = useNavigationViewModel();
  const { alerts, resolveAlert } = useAlertsViewModel();

  const selectedAlert = useMemo(
    () => alerts.find((a) => a.id === selectedAlertId),
    [alerts, selectedAlertId]
  );

  const onBack = useCallback(() => {
    setSelectedAlertId(null);
    setActiveTab('home');
  }, [setSelectedAlertId, setActiveTab]);

  const onSelectAlert = useCallback(
    (id: string) => setSelectedAlertId(id),
    [setSelectedAlertId]
  );

  const onCloseDetail = useCallback(
    () => setSelectedAlertId(null),
    [setSelectedAlertId]
  );

  const onResolve = useCallback(
    (id: string) => resolveAlert(id),
    [resolveAlert]
  );

  return {
    alerts,
    selectedAlert,
    selectedAlertId,
    onBack,
    onSelectAlert,
    onCloseDetail,
    onResolve,
  };
};
