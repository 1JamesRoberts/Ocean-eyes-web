# OceanEyes Web — AI Agent Guide

## Project Overview

OceanEyes is a React + TypeScript dashboard for real-time AI aquarium monitoring. It combines computer vision (fish detection, species classification, turbidity) with water chemistry telemetry.

> 📄 See [README.md](./README.md) for full feature list and setup instructions.

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
├── hooks/            # Custom hooks (useTank, useFish, useAlerts, useReadings, useLiveState, useHistory)
├── services/         # Business logic & API
│   ├── mock_service.ts      # localStorage-backed Firestore simulation
│   ├── realDataService.ts   # Fetches real AI inference records from backend
│   ├── ai_service.ts        # FastAPI backend communication
│   ├── healthCalculator.ts  # Pure health score calculation
│   └── chemistrySimulator.ts # Placeholder water chemistry values
├── components/       # UI components by feature (home/, live/, analytics/, fish/)
├── pages/            # Route-level components (ViewerApp, IoTMonitor)
├── types/            # TypeScript interfaces (aquarium.ts)
├── data/             # Species catalog (auto-generated, do not edit)
└── utils/            # Shared formatting utilities
```

## Styling with Tailwind CSS v4

Tailwind CSS v4 is the default and preferred styling system for all UI work. Use utility classes for layout, spacing, typography, colors, borders, gradients, and animations. Avoid writing custom CSS except for values that cannot be expressed with utilities.

- Prefer theme tokens registered in `@theme` in `src/index.css` (e.g., `bg-surface-card`, `text-text-main`, `border-border-card`).
- Use bracket syntax for legacy CSS custom properties: `bg-[var(--color-surface)]`, `text-[var(--color-text-primary)]`, `border-[var(--color-border)]`.
- Custom shadow tokens must use inline `style={{ boxShadow: 'var(--shadow-card)' }}`.
- Use `@theme` animation tokens: `animate-float-1`, `animate-float-2`, `animate-scan`, `animate-fade-in`, `animate-slide-up`.
- CSS Modules are a last resort. If required, include `@reference "#tailwind";` at the top.
- Run `npm run lint` after changing Tailwind classes.

## Coding Conventions

### TypeScript

- **Strict mode** enabled. Use `import type` for type-only imports (`verbatimModuleSyntax`).
- Prefer `interface` over `type` for object shapes.
- Use `React.FC` for component types with explicit `Props` interface.

### React & Hooks

- Functional components with hooks only (no class components).
- Hooks in `src/hooks/` follow the pattern: state init from `MockFirestore`, `useEffect` with `subscribeToDb` for sync, return state + actions.
- `// eslint-disable-next-line react-hooks/set-state-in-effect` and `react-hooks/exhaustive-deps` are commonly used in hooks — accept these where justified.

### Styling

See the dedicated [Styling with Tailwind CSS v4](#styling-with-tailwind-css-v4) section above. Only use legacy classes (`card-decoration`, `dashboard-grid`, `canvas-header`, `primary-button`, `secondary-button`, `live-camera-feed`) when modifying existing components that already depend on them; otherwise prefer Tailwind utilities.

### Data Flow

- **Mock mode** (default): `MockFirestore` class reads/writes localStorage. Hooks subscribe via `subscribeToDb()` for cross-component sync.
- **Real mode**: `realDataService.ts` fetches from AI backend (`localhost:8000`).
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

- **Species catalog regeneration** requires network access to selectyourfish.com.
