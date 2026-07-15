import { useState, useCallback } from 'react';
import type { AIDetectionResult } from '../../types/aquarium';

export interface UseManualDiagnosisViewModelResult {
  manualDiagnosisLoading: boolean;
  manualDiagnosisError: string | null;
  lastManualDiagnosis: AIDetectionResult | null;
  manualDiagnose: () => Promise<void>;
}

export const useManualDiagnosis = (): UseManualDiagnosisViewModelResult => {
  const [manualDiagnosisLoading] = useState(false);
  const [manualDiagnosisError, setManualDiagnosisError] = useState<string | null>(null);
  const [lastManualDiagnosis] = useState<AIDetectionResult | null>(null);

  const manualDiagnose = useCallback(async () => {
    setManualDiagnosisError('Disease diagnosis is disabled in the on-device prototype.');
  }, []);

  return {
    manualDiagnosisLoading,
    manualDiagnosisError,
    lastManualDiagnosis,
    manualDiagnose,
  };
};
