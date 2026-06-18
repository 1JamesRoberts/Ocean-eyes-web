# OceanEyes Alert System — Full Specification

> **Status:** Draft  
> **Last updated:** 2026-06-18  
> **Applies to:** Ocean-eyes-web (React + TypeScript dashboard)

---

## Table of Contents

1. [Core Design Principles](#1-core-design-principles)
2. [The 4-Tier Severity Model](#2-the-4-tier-severity-model)
3. [Alert Triggers — Complete Catalog](#3-alert-triggers--complete-catalog)
4. [Data Model](#4-data-model)
5. [Notification Behaviour](#5-notification-behaviour)
6. [UI/UX Behaviour](#6-uiux-behaviour)
7. [Alert Lifecycle](#7-alert-lifecycle)
8. [Trigger Implementation Map](#8-trigger-implementation-map)
9. [Migration Plan](#9-migration-plan)
10. [Degradation & Edge Cases](#10-degradation--edge-cases)

---

## 1. Core Design Principles

1. **One tier per action timeline.** Every severity tells the user *how urgently to act*, not what the system categorised.
2. **No unused tiers.** Each tier has at least one concrete trigger from day one.
3. **Severity is not status.** `resolved` (boolean) is the status field. "Good" is not a severity — a resolved critical alert is still a critical alert.
4. **Silent by default, push by escalation.** Only Warning and Critical warrant unsolicited notifications. Check is opt-in.
5. **Deduplication at trigger time.** Don't stack duplicate alerts for the same condition. Coalesce: update the existing alert, don't create a new one.
6. **Each alert must carry a resolution action.** Every alert either self-resolves (condition clears) or needs explicit dismissal. No orphan alerts.

---

## 2. The 4-Tier Severity Model

```
    NOTE      →    CHECK      →    WARNING     →    CRITICAL
   (silent)     (optional        (push +          (push +
                 badge)           persistent)      persistent
                                                   + escalate)
```

| # | Tier | Icon | Verb | What it means | When you act |
|---|------|------|------|---------------|--------------|
| 1 | **Note** | 📓 | note it | Awareness only. A thing happened. | Whenever you browse alerts |
| 2 | **Check** | 🔍 | check it | Something is off but not urgent. Check next time you feed. | Before next feeding |
| 3 | **Warning** | ⚠️ | fix it | A parameter is out of acceptable range. Fix today. | Today |
| 4 | **Critical** | 🚨 | act now | Immediate danger to livestock. Stop and fix now. | Immediately |

### Timeline Mapping

```
Now                       1h                    6h                  24h
 ├── Critical ─────────────┤
 ├── Warning ───────────────────────────────────┤
 ├── Check ─────────────────────────────────────────────────────────┤
 └── Note ──────────────────────────────────────────────────────────────────→
                                                                         (no deadline)
```

### Visual Identity

| Tier | Color token | HEX | Alert list indicator |
|---|---|---|---|
| Note | `text-muted` / slate | `#64748B` | No left border. Grey icon. |
| Check | `warning` / yellow | `#EAB308` | Thin 3px yellow left border. Yellow icon. |
| Warning | `critical` / orange | `#F97316` | 4px orange left border. Orange icon. |
| Critical | `critical` / red | `#EF4444` | 5px red left border (thickest). Red icon. Pulsing dot. |

---

## 3. Alert Triggers — Complete Catalog

### Tier 1 — Note 📓

| ID | Trigger | Source Hook/File | Dedup Key | Self-resolves? |
|----|---------|------------------|-----------|----------------|
| N1 | AI polling started | `useAIPolling.ts` — toggle on | `note-polling-on` | No (one-shot) |
| N2 | AI polling stopped | `useAIPolling.ts` — toggle off | `note-polling-off` | No (one-shot) |
| N3 | Water line recalibrated | `MonitorCalibrationScreen.tsx` | `note-calibration-{timestamp}` | No (one-shot) |
| N4 | Species composition shift (single poll) | `useAIPolling.ts` | `note-species-shift-{species}` | Yes (next poll reverts) |
| N5 | Fish count increased above baseline | `useAIPolling.ts` | Coalesced per session | Yes (next poll reverts) |

**Title templates:**
- N1: "AI Analysis Started"
- N2: "AI Analysis Stopped"
- N3: "Water Line Recalibrated"
- N4: "{Species} count dropped from {before} → {after}"
- N5: "Fish count rose to {count} — fry detected?"

---

### Tier 2 — Check 🔍

| ID | Trigger | Source Hook/File | Dedup Key | Self-resolves? |
|----|---------|------------------|-----------|----------------|
| C1 | Turbidity trending up (3–5 FNU, below threshold) | `useTurbidityMeasurement.ts` or `useReadings.ts` | `check-turbidity-trend` | Yes (falls below 3 FNU) |
| C2 | Fish count drop 25–50% (single poll) | `useAIPolling.ts` | `check-fish-drop` | Yes (count recovers) |
| C3 | pH drift (7.2 → 7.6 or 6.8 over 6h) | `useReadings.ts` or `useChemistryAlert.ts` | `check-ph-drift` | Yes (pH returns to 7.0–7.4) |
| C4 | Sustained species shift (same anomaly 3+ consecutive polls) | `useAIPolling.ts` | `check-species-loss-{species}` | Default: manual resolve |
| C5 | Backend offline briefly, now recovered | `useBackendStatus.ts` | -- (fires once on reconnect) | No (one-shot) |
| C6 | Health score 6.0–7.9 | `healthCalculator.ts` / `useReadings.ts` | `check-health-score` | Yes (score rises above 8) |
| C7 | Single-trigger disease flag (low confidence <60%) | `useAIPolling.ts` — diagnosis exists but below threshold | `check-lowconf-disease` | Yes (next diagnosis clears) |

**Title templates:**
- C1: "Turbidity rising — currently {value} FNU"
- C2: "Fish count dropped {pct}% — {before} → {after}"
- C3: "pH drifting — now {value}"
- C4: "{Species} count consistently low — consider checking tank"
- C5: "AI Backend reconnected after {duration}s downtime"
- C6: "Tank health score at {score}/10 — mild concern"
- C7: "Possible {disease} detected (low confidence)"

**Message body template for all Check alerts:**
> "This happened {summary}. Recommended action: {action}. No immediate danger, but monitor over the next feeding cycle."

---

### Tier 3 — Warning ⚠️

| ID | Trigger | Source Hook/File | Dedup Key | Self-resolves? |
|----|---------|------------------|-----------|----------------|
| W1 | Turbidity exceeds tank threshold (`max_turbidity_fnu`) | `useTurbidityMeasurement.ts` / `useReadings.ts` | `warning-turbidity` | Yes (falls below threshold) |
| W2 | Fish count drop >50% | `useAIPolling.ts` | `warning-fish-drop` | Yes (count recovers) |
| W3 | pH borderline (6.0–6.5 or 7.8–8.5) | `useReadings.ts` | `warning-ph` | Yes (pH returns) |
| W4 | Ammonia detected (>0.05 ppm) | `useReadings.ts` / chemistry sensor | `warning-ammonia` | Yes (ammonia clears) |
| W5 | Nitrite rising (>0.25 ppm) | `useReadings.ts` / chemistry sensor | `warning-nitrite` | Yes (nitrite clears) |
| W6 | No readings for 10 minutes | `useCameraFeed.ts` / timer hook | `warning-no-data-10m` | Yes (data resumes) |
| W7 | 5 consecutive AI backend failures | `useBackendStatus.ts` | `warning-ai-failures` | Yes (backend recovers) |
| W8 | Health score 4.0–5.9 | `healthCalculator.ts` | `warning-health-score` | Yes (score rises) |
| W9 | Mock clarity triggered (dev/test) | `ActiveMonitoringScreen.tsx` | same as current | Manual |

**Title templates:**
- W1: "Water clarity exceeds threshold — {value} FNU"
- W2: "Sudden fish count drop — {pct}% loss"
- W3: "pH out of range — {value}"
- W4: "Ammonia detected — {value} ppm"
- W5: "Nitrite rising — {value} ppm"
- W6: "No camera data for 10 minutes"
- W7: "AI Backend unreachable — {failure_count} consecutive failures"
- W8: "Tank health score declining — {score}/10"
- W9: "Simulated: Water clarity dropped"

**Message body template:**
> "{trigger_description}. Your tank's {parameter} is at {value} (threshold: {threshold}). Recommended: {action}. Check the tank within the next few hours."

---

### Tier 4 — Critical 🚨

| ID | Trigger | Source Hook/File | Dedup Key | Self-resolves? |
|----|---------|------------------|-----------|----------------|
| R1 | Disease detected (AI diagnosis, healthy=false) | `useAIPolling.ts` / `useManualDiagnosis.ts` | `critical-disease-{fish}` | Manual |
| R2 | Extreme turbidity (>2× threshold = >10 FNU) | `useTurbidityMeasurement.ts` | `critical-turbidity-extreme` | Yes (falls below 2× threshold) |
| R3 | pH crisis (<6.0 or >8.5) | `useReadings.ts` | `critical-ph-crisis` | Yes (pH returns) |
| R4 | Ammonia spike (>0.25 ppm) | `useReadings.ts` | `critical-ammonia-spike` | Yes (ammonia clears) |
| R5 | No data for 1+ hours | timer/cron hook | `critical-no-data-1h` | Yes (data resumes) |
| R6 | Fish count drop >70% | `useAIPolling.ts` | `critical-fish-loss` | Yes (count recovers) |
| R7 | Health score crash (<4.0) | `healthCalculator.ts` | `critical-health-crash` | Yes (score rises) |

**Title templates:**
- R1: "🚨 Disease outbreak: {disease} detected on {species}"
- R2: "🚨 Extreme turbidity — {value} FNU"
- R3: "🚨 pH crisis — {value}"
- R4: "🚨 Ammonia spike — {value} ppm"
- R5: "🚨 Tank completely offline — no data for {duration}"
- R6: "🚨 Mass fish loss — {pct}% population gone"
- R7: "🚨 Tank health critical — {score}/10"

**Message body template:**
> "URGENT: {trigger_description}. Value: {value}. Immediate action required: {action}. Notify your aquarium service if needed."

---

## 4. Data Model

### TypeScript Interface

```typescript
// src/types/aquarium.ts

export type AlertSeverity = 'note' | 'check' | 'warning' | 'critical';

export interface AlertItem {
  /** Unique identifier */
  id: string;
  /** Severity tier */
  severity: AlertSeverity;
  /** Short headline (shown in alert list) */
  title: string;
  /** Detailed description */
  message: string;
  /** Recommended action */
  tip: string;
  /** Human-readable "time ago" string */
  timeAgo: string;
  /** ISO-8601 timestamp */
  timestamp: string;
  /** Whether the condition has been resolved */
  resolved: boolean;
  /** ISO-8601 timestamp when resolved (null if not resolved) */
  resolvedAt?: string;

  // ─── Context fields (for detail view) ───
  /** Clarity before the event (display string) */
  clarityBefore?: string;
  /** Clarity after the event (display string) */
  clarityAfter?: string;
  /** Fish count before the event */
  fishBefore?: string;
  /** Fish count after the event */
  fishAfter?: string;
  /** Trigger ID from the catalog above (e.g. "W1", "R4") */
  triggerId?: string;
  /** Whether the user has seen/opened this alert */
  acknowledged?: boolean;
}

export interface Thresholds {
  max_turbidity_fnu: number;
  fish_change_pct: number;
  ph_min?: number;     // default 6.5
  ph_max?: number;     // default 8.0
  ammonia_max?: number; // default 0.05
  nitrite_max?: number; // default 0.25
}
```

### Key Changes from Current Model

| Current | Proposed | Why |
|---------|----------|-----|
| `severity: 'info' \| 'warning' \| 'critical' \| 'good'` | `severity: 'note' \| 'check' \| 'warning' \| 'critical'` | Replace unused `info` and incorrectly-used `good` with real tiers |
| `clarityBefore: string` | `clarityBefore?: string` | Optional — not all alerts involve clarity |
| `clarityAfter: string` | `clarityAfter?: string` | Same |
| `fishBefore: string` | `fishBefore?: string` | Same |
| `fishAfter: string` | `fishAfter?: string` | Same |
| _(missing)_ | `resolvedAt?: string` | Track when it was resolved |
| _(missing)_ | `triggerId?: string` | Programmatic dedup key |
| _(missing)_ | `acknowledged?: boolean` | Read/unread tracking |
| _(missing)_ | `Thresholds` expanded | pH, ammonia, nitrite thresholds |

---

## 5. Notification Behaviour

| Tier | In-app badge | Push notification | Persistent alert | Escalation |
|------|:---:|:---:|:---:|:---:|
| Note | ❌ | ❌ | ❌ | ❌ |
| Check | ✅ (optional) | Opt-in (default off) | ❌ | ❌ |
| Warning | ✅ | ✅ (default on) | ✅ (orange badge on bell) | ❌ |
| Critical | ✅ | ✅ (forced red badge on bell + pulsing) | ✅ (sticky at top of list, not collapsible until resolved) | Optional: SMS/email for R1–R4 |

### Implementation

```typescript
export function getNotificationConfig(severity: AlertSeverity): {
  badge: boolean;
  push: boolean;
  persistent: boolean;
  escalate: boolean;
} {
  switch (severity) {
    case 'note':     return { badge: false, push: false, persistent: false, escalate: false };
    case 'check':    return { badge: true,  push: false, persistent: false, escalate: false };
    case 'warning':  return { badge: true,  push: true,  persistent: true,  escalate: false };
    case 'critical': return { badge: true,  push: true,  persistent: true,  escalate: true  };
  }
}
```

---

## 6. UI/UX Behaviour

### Alert List (AlertsScreen.tsx)

```
┌────────────────────────────────────────────────┐
│  Alerts (3 unread)                             │
│                                                │
│  🚨 Disease outbreak: Ich on Neon Tetra        │  ← Critical (red border 5px)
│     AI detected signs of Ich on 1 fish...       │     Pulsing red dot on left
│     just now                                    │     Sticky at top
├────────────────────────────────────────────────┤
│  ⚠️ Water clarity exceeds threshold — 6.2 FNU  │  ← Warning (orange border 4px)
│     Your tank's turbidity is at 6.2 FNU...       │
│     5 min ago                                    │
├────────────────────────────────────────────────┤
│  🔍 Fish count dropped 40% — 12 → 7           │  ← Check (yellow border 3px)
│     This happened in the last poll cycle...      │
│     15 min ago                                   │
├────────────────────────────────────────────────┤
│  📓 Water Line Recalibrated                    │  ← Note (no border, grey)
│     Water line reference updated to y=185       │
│     2h ago                                      │
└────────────────────────────────────────────────┘
```

### Behaviour Rules

1. **Sorting:** Critical always at top (within that section, newest first). Then Warning, Check, Note — each section newest-first.
2. **Unacknowledged indicators:** Critical and Warning alerts have a left coloured dot that pulses until the user opens the detail view. Check alerts have a static dot. Note alerts have no dot.
3. **Resolved alerts:** Move to a "Resolved" section at the bottom, opacity 0.6. They remain visible until the user clears them or the list exceeds 200 items (oldest auto-purged).
4. **Persistence:** A resolved Critical alert is still shown with red text "RESOLVED" badge + `resolvedAt` timestamp. History matters for critical events.
5. **Badge counter:** Top-level navigation shows unread count = unresolved Critical + unresolved Warning + unresolved unacknowledged Check alerts.

### Alert Detail (AlertDetail.tsx)

```
┌────────────────────────────────────────────────┐
│  ← Back to Alerts                              │
│                                                │
│  🚨 CRITICAL                                   │
│  Disease outbreak: Ich on Neon Tetra           │
│                                                │
│  AI detected signs of Ich on a Neon Tetra      │
│  (Tetrahymena): White spots visible on fins    │
│  and body.                                     │
│                                                │
│  ── Recommended Action ──                      │
│  Raise temperature to 30°C gradually over      │
│  2 hours. Add aquarium salt (1 tsp/5L).        │
│  Treat with malachite green-based medication.  │
│                                                │
│  ── Context ──                                 │
│  Clarity: 2.5 → 2.8 FNU                        │
│  Fish population: 12 → 12                      │
│                                                │
│  ── Timeline ──                                │
│  • 18 Jun 15:30 — Alert triggered              │
│  • 18 Jun 15:32 — You viewed this alert        │
│  • (— not yet resolved —)                      │
│                                                │
│  [✓ Mark as Resolved]  [Share Report]           │
└────────────────────────────────────────────────┘
```

---

## 7. Alert Lifecycle

```
                    ┌─────────────┐
                    │  TRIGGERED  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  ACTIVE     │  ← visible in main list
                    │  (unread)   │     coloured dot pulses
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼──────┐    │    ┌───────▼──────┐
       │ User opens  │    │    │ Self-resolves │
       │ (viewed)    │    │    │ (condition    │
       │ ack=true    │    │    │  clears)      │
       └──────┬──────┘    │    └───────┬──────┘
              │            │            │
              └────────────┼────────────┘
                           │
                   ┌───────▼───────┐
                   │  User manually│   OR
                   │  resolves     │   Self-resolve
                   │  (resolved=   │   (resolved=
                   │   true)       │   true)
                   └───────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  RESOLVED    │  ← moves to resolved section
                    │  (greyed)    │     keeps severity badge
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  AUTO-PURGED │  ← oldest 200+ resolved alerts
                    │  (>200 list) │     are silently removed
                    └──────────────┘
```

### Resolution Rules

| Resolution type | Applies to | How |
|----------------|-----------|-----|
| **Self-resolve** | All Note, most Check, Warning R5, Warning R7, Critical R2–R7 | When hook detects condition is no longer met (e.g. turbidity falls back below threshold), call `resolveAlert(id)` automatically |
| **Manual resolve** | Critical R1 (disease), C4 (sustained species loss), any self-resolvable that hasn't cleared | User taps "Mark as Resolved" in detail view |
| **One-shot** | N1–N3, C5 | These describe events, not ongoing conditions. They never self-resolve. User dismisses or they age out at list limit. |

---

## 8. Trigger Implementation Map

### Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useAIPollingAlerts.ts` | Alert logic extracted from `useAIPolling.ts` (turbidity threshold, fish count drop, species shift, disease) |
| `src/hooks/useChemistryAlert.ts` | pH drift, ammonia, nitrite alerts (triggered by new readings) |
| `src/hooks/useFeedHeartbeat.ts` | No-data timer alerts |

### Files to Modify

| File | Changes |
|------|---------|
| `src/types/aquarium.ts` | Replace `AlertItem` type, expand `Thresholds`, add `AlertSeverity` |
| `src/hooks/useAlerts.ts` | Add `dismissAlert()` for one-shot events, add `acknowledgeAlert()` for read tracking |
| `src/hooks/live/useAIPolling.ts` | Extract alert logic into `useAIPollingAlerts.ts` — keep polling code clean |
| `src/hooks/live/useManualDiagnosis.ts` | Update severity from hardcoded `critical` to use tier system |
| `src/hooks/live/useTurbidityMeasurement.ts` | Add threshold check + Warning/Critical alert trigger |
| `src/services/localStorageStore.ts` | Update `saveAlerts` with migration from old severity values |
| `src/pages/viewer/AlertsScreen.tsx` | Update list rendering for 4 tiers, sticky Critical, resolved section |
| `src/components/shared/AlertDetail.tsx` | Add timeline, acknowledge button, self-resolve badge |
| `src/services/healthCalculator.ts` | Return health score + trigger severity recommendation |

### Hook Data Flow

```
                  ┌─────────────────┐
                  │  AI Polling      │
                  │  (every 10s)     │
                  └────────┬────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
     ┌────────▼────────┐      ┌─────────▼─────────┐
     │ useAIPolling-   │      │ useTurbidity-      │
     │ Alerts.ts       │      │ Measurement.ts     │
     │                 │      │                    │
     │ • disease check │      │ • threshold check  │
     │ • fish count    │      │ • extreme check    │
     │ • species shift │      │ • trend alert      │
     └────────┬────────┘      └─────────┬──────────┘
              │                         │
              └────────────┬────────────┘
                           │
                    ┌──────▼──────┐
                    │ useAlerts   │
                    │ .addAlert() │
                    │ .resolve()  │
                    │ .dismiss()  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ localStorage│
                    │ Store       │
                    └─────────────┘
```

---

## 9. Migration Plan

### Phase 1 — Type changes (1 session)
1. Update `AlertSeverity` type in `aquarium.ts`
2. Expand `Thresholds` with ph/ammonia/nitrite defaults
3. Add optional fields to `AlertItem`
4. Run `npm run lint` to confirm no type breakage

### Phase 2 — Existing alert reclassification (1 session)
Map every hardcoded `addAlert()` call:

| Current location | Old severity | New severity |
|-----------------|-------------|--------------|
| `useAIPolling.ts:132` | `critical` | `critical` — no change |
| `useManualDiagnosis.ts:97` | `critical` | `critical` — no change |
| `ActiveMonitoringScreen.tsx:57` | `warning` | `warning` — no change |

(Existing alerts are already in the right tiers. No reclassification needed.)

### Phase 3 — Migration function for stored data
In `localStorageStore`, add a migration step (v4) that:
1. Reads all existing alerts from localStorage
2. Maps `'info' → 'note'`, `'good' → 'note'` (these were never used, but safe)
3. Leaves `'warning'` and `'critical'` unchanged
4. Writes back with updated schema version

```typescript
// Migration v4: Alert severity rename
if (currentVersion < 4) {
  const alerts = getOrDefault<AlertItem[]>(STORAGE_KEYS.alerts, []);
  const migrated = alerts.map((alert) => {
    let severity = alert.severity;
    if (severity === 'info' || severity === 'good') severity = 'note';
    return { ...alert, severity };
  });
  safeSetItem(STORAGE_KEYS.alerts, JSON.stringify(migrated));
}
```

### Phase 4 — UI updates (1-2 sessions)
1. Update `AlertDetail.tsx` to render 4-tier colour/icon mapping
2. Update `AlertsScreen.tsx` to sort by severity, sticky Critical, resolved section
3. Add acknowledge button and ack state indicator

### Phase 5 — New trigger hooks (2-3 sessions)
1. `useAIPollingAlerts.ts` — fish count drop, species shift, disease
2. `useChemistryAlert.ts` — pH, ammonia, nitrite
3. `useFeedHeartbeat.ts` — no-data timer
4. Wire each into the relevant monitor screen

---

## 10. Degradation & Edge Cases

### What happens when...

| Scenario | Behaviour |
|----------|-----------|
| **localStorage is full** | `safeSetItem` catches the `QuotaExceededError`, dispatches a `STORAGE_ERROR_EVENT`. The UI subscribes to this and shows a warning banner: "Storage full — old alerts will be discarded." |
| **200+ unresolved alerts** | This shouldn't happen in practice (alerts self-resolve). If it does, the list caps display at 200 and logs a warning. |
| **Turbidity threshold is 0** | Invalid config. Clamp threshold to ≥ 0.1 FNU. An alert with a nonexistent threshold would fire every time — don't allow it. |
| **Same condition triggers multiple times** | Dedup via `triggerId` field. If an unresolved alert with the same `triggerId` exists, update its `timestamp` instead of creating a new one. The `timeAgo` updates to "Updated just now". |
| **Phone-side app goes offline mid-alert** | The no-data timer starts. No data after 10m → Warning W6. No data after 1h → Critical R5. When data resumes, both self-resolve. |
| **User clears all alerts** | Add a "Clear All Resolved" button. Unresolved Critical and Warning alerts cannot be bulk-cleared. |
| **Thresholds are changed by user** | Existing unresolved threshold-based alerts re-evaluate on the next relevant data point. If the new threshold no longer triggers, the alert self-resolves. |
| **Two Critical alerts active simultaneously** | Both are sticky-sorted at the top. The user must resolve them individually. |
| **Browser tab is closed during alert trigger** | `addAlert()` writes to `localStorage` synchronously before returning. The alert survives tab close. On next load, `useAlerts` picks it up from `getSnapshot()`. |

---

## Appendix A: Current → Future State Comparison

| Aspect | Current | Future |
|--------|---------|--------|
| Tiers | 4 (one unused, one misused) | 4 (all used, clear distinctions) |
| Trigger count | 3 | 20+ |
| Self-resolution | None | Most alerts self-resolve |
| Thresholds used? | No (stored but never checked) | Yes (turbidity, fish count, pH, ammonia, nitrite) |
| Deduplication | Manual check in ActiveMonitoringScreen only | Systematic via `triggerId` |
| Notification levels | None | 4 tiers × notification behaviour |
| Resolved tracking | `resolved: boolean` | `resolved: boolean` + `resolvedAt?: string` |
| Read tracking | None | `acknowledged?: boolean` |
| Health score alerts | No (calculator exists but no output) | Yes (Warning at 4–6, Critical <4) |
| Cleanup | Manual | Auto-purge at 200 resolved alerts |
