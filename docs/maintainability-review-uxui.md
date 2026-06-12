# Maintainability Review: UX/UI Scope

**Reviewer:** maintainability
**Scope:** React + TypeScript webapp UX/UI code (OceanEyes)
**Date:** 2026-06-12

## Summary

This review examines the frontend codebase for structural decisions that make UI/UX code harder to understand, change, or delete over time. Findings are organized by issue type with confidence scores (high ≥0.80, moderate 0.60–0.79). Low-confidence style preferences are suppressed.

---

## Findings

### Dead or Unreachable Code

| # | File | Location | Description | Confidence |
|---|------|----------|-------------|------------|
| 1 | `src/hooks/useDataSync.ts` | line 30 (`export const useDataSync`) | The entire `useDataSync` hook is exported but has zero consumers. It appears to be a leftover from an earlier real-time sync architecture; the app now relies on individual hooks (`useTank`, `useFish`, etc.) subscribing directly to `LocalStorageStore` events. | 0.95 |
| 2 | `src/hooks/useCameraFeed.ts` | lines 14, 92, 122 (`stopStream`) | `stopStream` is defined in the hook interface and returned from the hook, but no component or hook consumer calls it. The stream is only started, never explicitly stopped through this API. | 0.90 |
| 3 | `src/types/aquarium.ts` | line 3 (`export interface SpeciesCount`) | `SpeciesCount` is exported but never referenced anywhere in the codebase. The fish inventory uses `FishEntry[]` and species breakdowns use `Record<string, number>`. | 0.95 |
| 4 | `src/types/aquarium.ts` | line 232 (`export interface HistoryDatesResponse`) | `HistoryDatesResponse` is exported but has no consumers. The history feature uses `HistoryDetectionResponse` and `HistoryTurbidityResponse` directly. | 0.95 |
| 5 | `src/services/ai_service.ts` | line 182 (`export async function getSpeciesList`) | `getSpeciesList` is exported but never called. Species data is loaded from the local `speciesCatalog.ts` instead. | 0.95 |
| 6 | `src/components/home/LiveFeedPreview.tsx` | line 22 (`activeFeed: _activeFeed`) | `LiveFeedPreview` destructures `activeFeed` from `useCameraFeed` as `_activeFeed` but never uses it. Only `liveState` and `startStream` are needed. | 0.85 |
| 7 | `src/App.tsx` | line 127 (`max-xs` utility classes) | `App.tsx` uses `max-xs:flex-col` and related utilities, but the custom `@theme` only defines `--breakpoint-xs: 600px`. Tailwind v4 does not automatically generate `max-xs` variants from arbitrary breakpoints, so these classes are likely ignored. | 0.80 |
| 8 | `src/pages/viewer/AnalyticsScreen.tsx` and `src/components/analytics/SpatialDetectionHeatmap.tsx` | `AnalyticsScreen` lines 86, 216; `SpatialDetectionHeatmap` line 268 | `font-inherit` is not a standard Tailwind utility, and `dark:hover:bg-white/5` is unreachable because no code toggles a `dark` class and no `darkMode` strategy is configured. These classes silently have no effect. | 0.80 |
| 9 | `src/pages/viewer/LiveScreen.tsx` | line 452 (`document.body.classList.contains('dark')`) | `takeSnapshot` branches on `document.body.classList.contains('dark')`, but the application never adds the `'dark'` class to body. The dark gradient branch is unreachable and the light branch always runs. | 0.90 |

### Premature Abstraction

| # | File | Location | Description | Confidence |
|---|------|----------|-------------|------------|
| 10 | `src/context/NavigationContext.tsx` | lines 4, 8–9, 21, 29–30 (`AppMode` / `activeMode` / `setActiveMode`) | `AppMode` (`'viewer' | 'monitor' | 'both'`), `activeMode`, and `setActiveMode` are defined and exposed, but no consumer reads `activeMode` or calls `setActiveMode`. The app always behaves as `'both'`, making this a feature flag with a single implementation. | 0.95 |
| 11 | `src/components/home/FishInventorySummary.tsx`, `src/components/live/FullscreenInventory.tsx`, `src/components/SpeciesSelector.tsx` | `FishInventorySummary` line 7; `FullscreenInventory` line 3; `SpeciesSelector` line 8 | The species thumbnail pattern (image with fallback to colored initials) is reimplemented independently in three components. A shared `SpeciesAvatar` component would remove the duplication and ensure consistent fallback behavior. | 0.80 |
| 12 | `src/pages/viewer/LiveScreen.tsx` and `src/components/live/SnapshotGallery.tsx` | `LiveScreen` ~line 513; `SnapshotGallery` line 50 | The same `formatDuration` helper (MM:SS) is implemented in both `LiveScreen` and `SnapshotGallery`. It should be moved to `utils/formatters.ts` to avoid drift. | 0.85 |

### Unnecessary Indirection

| # | File | Location | Description | Confidence |
|---|------|----------|-------------|------------|
| 13 | `src/components/live/CameraFeed.tsx` | line 22 (internal `useCameraFeed` call) | `CameraFeed` is a presentation wrapper that internally calls `useCameraFeed`, but every consumer (`LiveScreen`, `LiveFeedPreview`, `SpatialDetectionHeatmap`) already calls `useCameraFeed` to derive the same state. This causes duplicate `localStorage` subscriptions and splits responsibility between the hook and the component. | 0.85 |
| 14 | `src/pages/viewer/HistoryDetailScreen.tsx` | lines 15–75 (`drawClarityChart`) | `HistoryDetailScreen` contains an inline SVG area chart implementation that duplicates the logic in `src/components/analytics/MiniClarityChart.tsx`. Reusing `MiniClarityChart` would eliminate the duplicated scaling, grid, and gradient code. | 0.90 |

### Coupling Between Unrelated Modules

| # | File | Location | Description | Confidence |
|---|------|----------|-------------|------------|
| 15 | `src/hooks/useDataSync.ts` | lines 83–94 (mutating `LocalStorageStore.getFish` result) | `useDataSync` mutates `FishEntry` objects returned from `LocalStorageStore.getFish()` in place before passing the same array back to `LocalStorageStore.saveFish()`. This couples the sync logic to the store's object identity and creates shared mutable state that other components may hold references to. | 0.80 |
| 16 | `src/App.tsx` and `src/pages/ViewerApp.tsx` | `App.tsx` line 113; `ViewerApp.tsx` line 33 | The onboarding gate condition (`tankId === null`) is duplicated between `App.tsx` and `ViewerApp.tsx` with slightly different exceptions (`'monitor'` is excluded in `App.tsx` but not in `ViewerApp.tsx`). Centralizing the gate in `ViewerApp` would prevent the conditions from drifting apart. | 0.75 |

### Naming That Obscures Intent

| # | File | Location | Description | Confidence |
|---|------|----------|-------------|------------|
| 17 | `src/types/aquarium.ts` and `src/components/live/CameraFeed.tsx` | types line 94; component line 20 | The `CameraFeed` interface (data type) and `CameraFeed` component share the same name, forcing consumers to alias one as `CameraFeedType`. Renaming the interface to `CameraFeedConfig` or `FeedSource` would remove the collision. | 0.85 |
| 18 | `src/types/aquarium.ts` and consumers | types line 125; e.g. `SettingsScreen` lines 132, 156 | The threshold field is named `clarity_min`, but it is used as the maximum acceptable turbidity in FNU (alerts fire when `currentClarity > maxFnu`). The name suggests a minimum clarity value and obscures the actual semantics. | 0.85 |
| 19 | `src/services/localStorageStore.ts` | line 198 (`addFish` `_tankId` parameter) | `addFish` accepts a `_tankId` parameter that is intentionally unused (underscore prefix), yet fish entries are stored globally without tank association. The name obscures that per-tank fish ownership is not implemented. | 0.75 |

---

## Residual Risks

None identified.

## Testing Gaps

None identified.

---

## Notation

- **High confidence (0.80+):** Structural problem is objectively provable (single implementation, provably unreachable code, measurable layer with no added behavior).
- **Moderate confidence (0.60–0.79):** Finding involves judgment about naming quality, abstraction boundaries, or coupling severity.
- **Low confidence (<0.60):** Style preferences or debatable improvements — suppressed from this report.
