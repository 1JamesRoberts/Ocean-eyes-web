# AGENTS.md — OceanEyes Web

## Developer Commands
- `npm run dev` — Vite dev server (HMR)
- `npm run build` — **TypeCheck then Vite bundle** (`tsc -b && vite build`)
- `npm run lint` — ESLint flat config only
- `npm run preview` — Preview production build locally

## Architecture
- **Single Vite app**, not a monorepo. Entry: `src/main.tsx` → `src/App.tsx`
- **No router** — tab state lives in `AppContext` (`activeTab` string: `'home' | 'live' | 'settings' | 'alerts' | 'my_fish' | 'monitor'`)
- **State**: React Context (`src/context/AppContext.tsx`). No Redux/Zustand.
- **Data**: LocalStorage-backed mock Firestore (`src/services/mock_service.ts`) with seed data and `CustomEvent` sync.
- **Types**: `src/types/aquarium.ts` — shared interfaces for frontend and AI backend.

## Styling Rules
- **Vanilla CSS only** — no Tailwind, no CSS-in-JS, no styled-components.
- Design system lives in `src/index.css`: glassmorphism cards, HSL CSS custom properties, `Outfit`/`Inter` fonts, sidebar grid layout.
- Dark mode toggled via `body.dark` class (variables redefined there).

## TypeScript Constraints
- Project references: root `tsconfig.json` → `tsconfig.app.json` (src) + `tsconfig.node.json` (vite config).
- Strict: `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, `erasableSyntaxOnly`.
- **Use `import type {}` for type-only imports** — `verbatimModuleSyntax` will error otherwise.

## AI Backend (Python)
- FastAPI server in `ai/` directory. Entry: `ai/api_server.py`.
- ONNX models in `ai/models/` (`.onnx` files are **gitignored** — do not commit them).
- Start backend: `cd ai && pip install -r requirements.txt && uvicorn api_server:app --reload`
- Frontend connects via `src/services/ai_service.ts`. Endpoint base URL from `VITE_AI_API_URL` env var (defaults to `http://localhost:8000`).

## Agent Tooling
- Code health scan: `node .agents/skills/code-reviewer/scripts/code_health_checker.cjs`

## Gotchas
- `npm run build` runs `tsc -b` first — **type errors block the Vite build**.
- No test runner configured. Verify by building (`npm run build`) and linting (`npm run lint`).
- `index.html` title is still `"temp-vite"` — update if deploying publicly.
