// src/services/alertEngine.ts - Pure alert generation logic
import type { AlertItem } from '../types/aquarium';

export interface AlertCheckInput {
  currentClarity: number;
  totalExpectedFish: number;
  totalDetected: number;
  maxFnu: number;
  discrepancyPct: number;
}

export function checkClarityAlert(input: AlertCheckInput): AlertItem | null {
  const { currentClarity, maxFnu, totalExpectedFish, totalDetected } = input;
  
  if (currentClarity <= maxFnu) return null;

  return {
    id: `alert-c-${Date.now()}`,
    title: 'Water clarity dropped',
    message: `Water turbidity rose to ${currentClarity} FNU (Threshold: ${maxFnu}). Check your filter unit.`,
    tip: 'Your filters might require a quick scrub. Consider running a partial water cycle swap or verifying the intake system.',
    severity: 'warning',
    timeAgo: 'Just now',
    clarityBefore: '2.5',
    clarityAfter: currentClarity.toString(),
    fishBefore: totalExpectedFish.toString(),
    fishAfter: totalDetected.toString(),
    resolved: false,
    timestamp: new Date().toISOString()
  };
}

export function checkFishDiscrepancyAlert(input: AlertCheckInput): AlertItem | null {
  const { currentClarity, totalExpectedFish, totalDetected, discrepancyPct } = input;
  
  if (totalExpectedFish === 0) return null;
  
  const ratio = totalDetected / totalExpectedFish;
  if (ratio * 100 >= discrepancyPct) return null;

  return {
    id: `alert-f-${Date.now()}`,
    title: `Only ${totalDetected} of ${totalExpectedFish} fish visible`,
    message: `Fish visibility falls under ${discrepancyPct}% threshold. Check for distress or obstructions.`,
    tip: 'Inspect if they are nesting or sleeping in the corner, or hidden behind plant stalks. Run water parameter metrics checks.',
    severity: 'critical',
    timeAgo: 'Just now',
    clarityBefore: currentClarity.toString(),
    clarityAfter: currentClarity.toString(),
    fishBefore: totalExpectedFish.toString(),
    fishAfter: totalDetected.toString(),
    resolved: false,
    timestamp: new Date().toISOString()
  };
}

export function generateAlerts(input: AlertCheckInput): AlertItem[] {
  const alerts: AlertItem[] = [];
  
  const clarityAlert = checkClarityAlert(input);
  if (clarityAlert) alerts.push(clarityAlert);
  
  const fishAlert = checkFishDiscrepancyAlert(input);
  if (fishAlert) alerts.push(fishAlert);
  
  return alerts;
}
