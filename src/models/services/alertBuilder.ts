// alertBuilder.ts - Pure disease alert construction
import type { AIDetection, AlertItem } from '../../types/aquarium';

export function buildDiseaseAlert(
  detection: AIDetection,
  timestamp: string = new Date().toISOString()
): AlertItem {
  const diag = detection.diagnosis;
  if (!diag || diag.healthy) {
    throw new Error('buildDiseaseAlert requires a non-healthy diagnosis');
  }

  return {
    id: `alert-disease-${Date.now()}`,
    title: `Disease Alert: ${diag.disease}`,
    message: `AI detected signs of ${diag.disease} on a ${detection.species_display}: ${diag.description}`,
    tip: `Recommended Action: ${diag.treatment}`,
    severity: 'critical',
    timeAgo: 'Just now',
    clarityBefore: '',
    clarityAfter: '',
    fishBefore: '',
    fishAfter: '',
    resolved: false,
    timestamp,
  };
}
