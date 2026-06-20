// diagnosisCooldownService.ts - Manages the one-hour disease-diagnosis cooldown
import {
  LAST_DIAGNOSIS_TIME_KEY,
  DIAGNOSIS_COOLDOWN_MS,
} from '../../utils/constants';
import { getSnapshot, safeSetItem, notifyUpdate } from '../repositories/storageBase';

export function shouldRunDiagnosis(): boolean {
  const lastDiag = getSnapshot<number>(LAST_DIAGNOSIS_TIME_KEY, 0);
  return Date.now() - lastDiag > DIAGNOSIS_COOLDOWN_MS;
}

export function recordDiagnosisTime(): void {
  const result = safeSetItem(LAST_DIAGNOSIS_TIME_KEY, Date.now().toString());
  if (result.success) notifyUpdate(LAST_DIAGNOSIS_TIME_KEY);
}
