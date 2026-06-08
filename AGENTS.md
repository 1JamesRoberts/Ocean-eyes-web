# OceanEyes Web — Agent Guidelines

## Project Identity
- **Name**: OceanEyes Web
- **Stack**: React 19 + TypeScript + Vite
- **Styling**: Vanilla CSS with CSS custom properties and CSS Modules
- **Icons**: `lucide-react`
- **State**: LocalStorage-backed simulation (`src/services/mock_service.ts`)

## Core Role
Act as an expert Aquarium Web Systems & AI Integration Engineer.

1. All work targets the React/TypeScript/Vite root (not any legacy Flutter code).
2. Maintain the established desktop dashboard theme: HSL color tokens, glassmorphism, smooth transitions.
3. AI detection integration happens through `src/services/ai_service.ts` and ONNX models under `ai/models/`.
4. Every change must compile with zero errors (`npm run build`) and preserve strict TypeScript (`noUnusedLocals`, `noUnusedParameters`).

## Build & Test Commands
| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies |
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build |
| `npm run lint` | ESLint pass |

Run `npm run build` after any non-trivial change to verify type safety.

## Architecture
- **Entry**: `src/main.tsx` → `src/App.tsx` (sidebar + dashboard wrapper)
- **Pages**: `src/pages/ViewerApp.tsx` (customer dashboard) and `src/pages/IoTMonitor.tsx` (simulator console)
- **Components**: Co-located by feature under `src/components/{home,live,fish}/`
- **Hooks**: Data access layer in `src/hooks/` (tank, readings, alerts, simulation, live state)
- **Services**: Business logic and mock data in `src/services/`
- **Types**: Shared interfaces in `src/types/aquarium.ts`

## Conventions
- **Prefer explicit React.FC typing** with destructured props.
- **Inline styles are common** in this codebase (legacy from Flutter migration). When editing a file, extract repeated or complex `style={{...}}` objects into a co-located `.module.css` file. Keep dynamic values (e.g. `strokeDashoffset`) as inline styles.
- **CSS custom properties** in `src/index.css` are the source of truth for colors. Do not hardcode hex values in components—reference `var(--color-*)` tokens. CSS Modules should compose from these global variables.
- **Dark mode**: toggled via `body.dark` class on `<body>`. All color tokens have dark variants in `index.css`.
- **Responsive breakpoints** used throughout: `600px`, `768px`, `900px`, `1024px`.
- **Do not duplicate** documentation from `README.md` or `.agents/skills/`. Link instead.

## CSS Modules Convention
Scoped component styles live in co-located `.module.css` files (e.g. `WaterChemistryGrid.tsx` + `WaterChemistryGrid.module.css`).
- Global design tokens, layout grids, and reusable utility classes remain in `src/index.css`.
- Component-specific styles (flex layouts, spacing, borders) should be moved to CSS Modules to reduce inline style bloat.
- Dark mode continues to work automatically because all Modules reference `var(--color-*)` tokens defined in `index.css`.
- Vite supports CSS Modules out of the box—no extra configuration required.
