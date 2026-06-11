# OceanEyes Web — AI Agent Guide

## Project Overview

OceanEyes is a React + TypeScript dashboard for real-time AI aquarium monitoring. It combines computer vision (fish detection, species classification, turbidity) with water chemistry telemetry.

> 📄 See [README.md](./README.md) for full feature list and setup instructions.

## Quick Start

```bash
npm install        # Install dependencies
npm run dev        # Start Vite dev server (localhost:5173)
npm run build      # TypeScript check + production build
npm run lint       # ESLint check
npm run build:species  # Re-generate species catalog from selectyourfish.com
```

## Tech Stack

| Layer      | Technology                                                   |
| ---------- | ------------------------------------------------------------ |
| Framework  | React 19 + TypeScript 6                                      |
| Build      | Vite 8                                                       |
| Styling    | Tailwind CSS v4 + CSS custom properties (`var(--color-*)`) |
| Charts     | Recharts                                                     |
| Icons      | Lucide React                                                 |
| State      | React Context + localStorage (mock Firestore)                |
| AI Backend | Python FastAPI + ONNX models (port 8000)                     |

## Key Architecture

```
src/
├── context/          # React Context providers (NavigationContext)
├── hooks/            # Custom hooks (useTank, useFish, useAlerts, useReadings, useLiveState, useDataSync, useHistory)
├── services/         # Business logic & API
│   ├── mock_service.ts      # localStorage-backed Firestore simulation
│   ├── realDataService.ts   # Fetches real AI inference records from backend
│   ├── ai_service.ts        # FastAPI backend communication
│   ├── alertEngine.ts       # Pure alert generation logic
│   ├── healthCalculator.ts  # Pure health score calculation
│   └── chemistrySimulator.ts # Placeholder water chemistry values
├── components/       # UI components by feature (home/, live/, analytics/, fish/)
├── pages/            # Route-level components (ViewerApp, IoTMonitor)
├── types/            # TypeScript interfaces (aquarium.ts)
├── data/             # Species catalog (auto-generated, do not edit)
└── utils/            # Shared formatting utilities
```

## Coding Conventions

### TypeScript

- **Strict mode** enabled. Use `import type` for type-only imports (`verbatimModuleSyntax`).
- Prefer `interface` over `type` for object shapes.
- Use `React.FC` for component types with explicit `Props` interface.

### React & Hooks

- Functional components with hooks only (no class components).
- Hooks in `src/hooks/` follow the pattern: state init from `MockFirestore`, `useEffect` with `subscribeToDb` for sync, return state + actions.
- `useRef` for stable references in callbacks (see `useDataSync.ts` pattern).
- `// eslint-disable-next-line react-hooks/set-state-in-effect` and `react-hooks/exhaustive-deps` are commonly used in hooks — accept these where justified.

### Styling (Tailwind CSS v4)

- Use Tailwind utility classes with bracket syntax for CSS custom properties: `bg-[var(--color-surface)]`, `text-[var(--color-text-primary)]`, `border-[var(--color-border)]`.
- Custom shadow tokens must use inline `style={{ boxShadow: 'var(--shadow-card)' }}`.
- Animations via `@theme` tokens: `animate-float-1`, `animate-float-2`, `animate-scan`, `animate-fade-in`, `animate-slide-up`.
- Legacy CSS classes still in use: `card-decoration` (card wrapper), `dashboard-grid` (2fr/1fr), `canvas-header`, `primary-button`, `secondary-button`, `live-camera-feed`.
- **Dark mode** is built-in via CSS custom properties — always use `var(--color-*)` tokens.

### Data Flow

- **Mock mode** (default): `MockFirestore` class reads/writes localStorage. Hooks subscribe via `subscribeToDb()` for cross-component sync.
- **Real mode**: `realDataService.ts` fetches from AI backend (`localhost:8000`). `useDataSync` orchestrates polling.
- AI backend endpoints: `/health`, `/predict/detection`, `/predict/turbidity`, `/history/detections`, `/history/turbidity`.
- Backend proxy: Vite dev server proxies `/history` to `localhost:8000`.

### Species Data

- Catalog auto-generated from selectyourfish.com. Run `npm run build:species` to regenerate.
- **Do not edit** `src/data/speciesCatalog.ts` manually — use `scripts/species-overrides.json` instead.
- Species images live in `public/fish_crops/`.

## AI Backend (Python)

The AI pipeline runs separately:

```bash
cd ai
pip install -r requirements.txt
python api_server.py  # FastAPI on port 8000
```

See [ai/api_server.py](./ai/api_server.py) for API docs. Models:

- `models/fish_detection.onnx` — RF-Detr fish detection
- `models/species_classifier.onnx` — MobileNetV4 Species classification (24+ species)
- `models/turbidity.onnx` — Water turbidity estimation

## Common Pitfalls

- **LocalStorage schema**: Version is tracked via `oceaneyes_data_version`. Bump `DATA_VERSION` in `useDataSync.ts` to force migration.
- **Species catalog regeneration** requires network access to selectyourfish.com.

## Related Documentation

- [Consumer advertisement](./docs/consumer-advertisement.md) — Product overview
- [Git workflow](./.agents/skills/git-add-commit-push/SKILL.md) — Windows-safe git operations
- [Fish species integration](./.agents/skills/README.md) — Species data pipeline docs
