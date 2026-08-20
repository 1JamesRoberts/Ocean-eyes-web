export interface AlertTankPolicy {
  clarityMin: number;
  fishChangePct: number;
  turbidityFnuMax?: number;
}

export interface AlertReading {
  clarityScore: number;
  fishCount: number;
  turbidityFnu?: number;
}

export interface AlertCandidate {
  type: "clarity_low" | "fish_zero" | "fish_drop";
  severity: "warning" | "critical";
  title: string;
  message: string;
  tip: string;
  context: Record<string, number>;
}

/**
 * Pure threshold evaluation shared by the callable and unit tests.
 * Readings must be newest first. A seed reading has neither a positive clarity
 * score nor a positive turbidity value and is excluded from sustained checks.
 */
export function evaluateAlertCandidates(
  policy: AlertTankPolicy,
  readings: readonly AlertReading[],
): AlertCandidate[] {
  const current = readings[0];
  if (!current || !isRealReading(current)) return [];

  const previous = readings.length > 1 ? readings[1] : current;
  const candidates: AlertCandidate[] = [];
  const canUseFnu =
    current.turbidityFnu !== undefined &&
    policy.turbidityFnuMax !== undefined;
  const clarityOutsideRange = canUseFnu
    ? current.turbidityFnu! > policy.turbidityFnuMax!
    : current.clarityScore > 0 && current.clarityScore < policy.clarityMin;

  if (clarityOutsideRange) {
    const context: Record<string, number> = {
      clarity_before: previous.clarityScore,
      clarity_after: current.clarityScore,
      fish_count_after: current.fishCount,
    };
    if (previous.turbidityFnu !== undefined) {
      context.turbidity_fnu_before = previous.turbidityFnu;
    }
    if (current.turbidityFnu !== undefined) {
      context.turbidity_fnu_after = current.turbidityFnu;
    }
    candidates.push({
      type: "clarity_low",
      severity: "warning",
      title: "Water clarity needs attention",
      message: canUseFnu
        ? "Tank turbidity rose above your configured limit."
        : "Tank clarity dropped below your configured limit.",
      tip: "Check the filter intake for debris. Consider a partial water change if the condition persists.",
      context,
    });
  }

  const lastThree = readings.filter(isRealReading).slice(0, 3);
  if (
    lastThree.length === 3 &&
    lastThree.every((reading) => reading.fishCount === 0)
  ) {
    candidates.push({
      type: "fish_zero",
      severity: "critical",
      title: "No fish visible",
      message: "No fish were visible in three consecutive readings.",
      tip: "Check for jumpers, verify the pump is running, and test water parameters.",
      context: {
        fish_count_before: 0,
        fish_count_after: 0,
        clarity_after: current.clarityScore,
      },
    });
  }

  const priorPositiveFish = readings
    .slice(1)
    .map((reading) => reading.fishCount)
    .filter((count) => count > 0);
  if (priorPositiveFish.length >= 2 && current.fishCount > 0) {
    const average =
      priorPositiveFish.reduce((sum, count) => sum + count, 0) /
      priorPositiveFish.length;
    if (
      average > 0 &&
      current.fishCount < average * (1 - policy.fishChangePct / 100)
    ) {
      candidates.push({
        type: "fish_drop",
        severity: "warning",
        title: "Fish visibility dropped",
        message: "The visible fish count dropped noticeably from its recent average.",
        tip: "Some fish may be hiding. Check the tank, lighting, and water quality.",
        context: {
          fish_count_before: Math.round(average),
          fish_count_after: current.fishCount,
          clarity_after: current.clarityScore,
        },
      });
    }
  }

  return candidates;
}

function isRealReading(reading: AlertReading): boolean {
  return (
    reading.clarityScore > 0 ||
    (reading.turbidityFnu !== undefined && reading.turbidityFnu > 0)
  );
}
