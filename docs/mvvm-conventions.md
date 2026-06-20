# Frontend Architecture Conventions

The OceanEyes React/TypeScript frontend uses a simple, practical layout:

- `src/hooks/` — React hooks that own state, side effects, and lifecycle.
- `src/models/` — Data access, persistence, transport, and pure domain helpers.
- `src/components/` + `src/pages/` — UI: JSX, Tailwind classes, and event wiring.

This replaced an earlier MVVM experiment. Hooks are the public API that components consume.

## `src/hooks/` — State & side effects

Hooks read from and write to the Model layer, subscribe to storage changes, manage polling timers, and expose plain data + callbacks to components.

- Core hooks live directly in `src/hooks/` (`useTank`, `useFish`, `useAlerts`, `useReadings`, `useLiveFeed`, `useHistory`, `useDateRangeFromUrl`).
- Page hooks live in `src/hooks/pages/` and compose core hooks for a specific screen (`useHome`, `useAnalytics`, `useMyFish`, `useSettings`, `useAlertsScreen`, `useHistoryDetail`).
- Live camera / AI hooks live in `src/hooks/live/` (`useBackendStatus`, `useAIPolling`, `useTurbidityMeasurement`, `useManualDiagnosis`, `useCameraFilters`, `useMediaCapture`, `useAIAnalytics`, `useFullscreen`, `useViewportSize`).

Guidelines:

- Keep JSX and Tailwind classes out of hooks.
- Return plain objects, booleans, callbacks, and refs.
- Put pure business rules in `src/models/services/`; hooks coordinate them.

## `src/models/` — Data & pure helpers

The Model layer owns data, persistence, transport, and testable domain logic. It must not import React.

- `src/models/repositories/` — Shared `localStorage` primitives (`storageBase.ts`) plus all CRUD helpers (`getTanks`, `saveFish`, `writeReading`, `addAlert`, etc.).
- `src/models/services/` — Pure, testable helpers (`healthService`, `speciesService`, `alertBuilder`, `inferenceHelpers`, `historyAnalytics`, `readingRecorder`, etc.).
- `src/models/api/` — Thin HTTP client for the Python FastAPI backend (`aiApi.ts`).

Guidelines:

- No JSX, no Tailwind, no React hooks or context.
- Functions should be deterministic and side-effect-free where possible.
- All domain types come from `src/types/aquarium.ts`.

## `src/components/` + `src/pages/` — UI

Components render JSX and call hook callbacks. They should stay thin: local state is limited to UI concerns (open/closed, hover, form inputs).

Guidelines:

- Import hooks from `src/hooks/`.
- Import types from `src/types/`.
- Keep business calculations and side effects in hooks or Model helpers.

## Import graph

```text
Component/Page ──► Hook ──► Model
Hook ──► Hook
Model ──► Model
Model ──► src/types
Model ──► src/utils (pure helpers only)
```

Model code never depends on hooks or components.

## Testing

- Model services are unit-tested with Vitest (`npm run test`).
- Hooks can be tested with React Testing Library or integration tests.
- Components/Pages are primarily tested manually and should remain thin.
