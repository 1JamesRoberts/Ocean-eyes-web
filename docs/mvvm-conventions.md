# MVVM Conventions

This document defines the Model–View–ViewModel boundaries for the OceanEyes React/TypeScript frontend.

## Layers

### Model (`src/models/`)

The Model owns data, persistence, transport, and pure domain rules. It must not import React or any UI libraries.

- `src/models/repositories/` — CRUD adapters over `localStorage`, event emission, schema migrations.
- `src/models/services/` — Pure, testable domain logic (health scores, species stats, alert builders, history filters, etc.).
- `src/models/api/` — Thin HTTP client for the Python FastAPI backend.

Rules:

- No JSX, no Tailwind classes, no `useState`, `useEffect`, or `useContext`.
- Functions should be deterministic and side-effect-free where possible.
- All domain types come from `src/types/aquarium.ts`.

### ViewModel (`src/viewModels/`)

ViewModels are React hooks that expose observable state and commands to Views. They translate Model data into view-ready shapes and manage React lifecycle (subscriptions, polling, refs).

- `src/viewModels/` — Core domain ViewModels (`useTankViewModel`, `useFishViewModel`, etc.).
- `src/viewModels/pages/` — Page-level ViewModels that compose core ViewModels for a specific screen.
- `src/viewModels/live/` — Live camera / AI inference ViewModels.

Rules:

- No JSX or Tailwind classes.
- Import only from `src/models/`, `src/types/`, `src/utils/`, and other ViewModels.
- Return plain data objects, booleans, callbacks, and refs.
- Keep business rules in `src/models/services/`; ViewModels only coordinate.

### View (`src/components/`, `src/pages/`)

Views are styled React components. They render JSX and handle user events by calling ViewModel callbacks.

Rules:

- Import only from `src/viewModels/` and `src/types/`.
- Do not import from `src/models/` or `src/services/` directly.
- Keep local component state limited to UI concerns (open/closed, hover, form inputs).
- Business calculations and side effects belong in ViewModels or Models.

## Allowed Import Graph

```text
View ──► ViewModel ──► Model
View ──► Model types (src/types)
ViewModel ──► Model
ViewModel ──► ViewModel
Model ──► Model
Model ──► src/types
Model ──► src/utils (pure helpers only)
```

No layer may depend on a layer above it.

## Testing

- Model services are unit-tested with Vitest (`npm run test`).
- ViewModels can be tested with React Testing Library or integration tests.
- Views are primarily tested manually and should remain thin.

## Migration Notes

- The old `src/hooks/` and `src/services/` directories were removed after the MVVM migration.
- `src/services/ai_service.ts` was moved to `src/models/api/aiApi.ts`.
- `src/services/localStorageStore.ts` was split into `src/models/repositories/`.
- `src/services/healthCalculator.ts` became `src/models/services/healthService.ts`.
- `src/services/chemistrySimulator.ts` became `src/models/services/chemistryService.ts`.
