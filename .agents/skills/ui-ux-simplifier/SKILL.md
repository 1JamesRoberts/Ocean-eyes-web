---
name: ui-ux-simplifier
description: Find and implement maintainability-focused simplifications in OceanEyes React/TypeScript UI code by consolidating duplicated UI/UX components, variants, interaction states, and Tailwind patterns behind a single source of truth, and by identifying or removing provably dead presentation code. Use when asked to simplify, clean up, deduplicate, consolidate, or refactor UI components, pages, JSX, Tailwind classes, visual variants, UI assets, or interaction patterns. Restrict work to UI/UX concerns; do not refactor domain logic, data access, backend code, or general application architecture.
---

# UI/UX Simplifier

Simplify the presentation layer without redesigning it. Preserve rendered behavior, interaction semantics, accessibility, responsive behavior, and existing MVVM boundaries unless the user explicitly requests a UX change.

## Establish scope

1. Inspect the requested files and their directly related UI components.
2. For app-wide work, begin with `src/pages/`, `src/components/`, UI-facing files in `src/assets/`, and shared styling or token files.
3. Read hooks, models, contexts, tests, and route configuration only to understand UI reachability and public contracts. Do not refactor them unless a minimal type or import update is required by a UI refactor.
4. Exclude domain behavior, state architecture, API clients, persistence, data transformations, FastAPI/Python code, build configuration, and non-UI dependencies.

## Build an evidence map

Before proposing or editing abstractions:

- Inventory existing shared primitives and their call sites.
- Search for repeated component structure, Tailwind clusters, visual variants, copy, icons, state treatments, and interaction behavior.
- Trace imports, re-exports, route references, lazy imports, registries, string-based asset paths, and tests before declaring code dead.
- Compare candidates by semantics, accessibility, responsive behavior, and states—not visual resemblance alone.

Record each candidate with its locations, number of occurrences, meaningful differences, and likely owner.

## Consolidate repeated UI/UX

Prefer one source of truth when at least two call sites express the same stable UI concept or interaction contract.

Use this order:

1. Reuse an existing shared primitive unchanged.
2. Extend an existing primitive with a small, semantic variant or composition slot.
3. Extract a new shared primitive when the repeated contract is stable and broadly named.
4. Keep feature-specific composition, copy, and data mapping at the page or feature level.

Centralize the part that must remain consistent: structure, states, accessibility, layout rules, or semantic styling. Do not extract a component merely to deduplicate a short class string. Avoid broad `className` escape hatches, boolean-prop matrices, page-specific names in shared code, and abstractions with only one credible consumer.

Use composition for meaningful structural differences. Use semantic variants for a closed visual set. If two components only look similar but communicate different concepts or behave differently, keep them separate and share a lower-level primitive if useful.

## Detect UI/UX dead code

Consider only presentation-layer dead code, including:

- Unreferenced React components, UI helpers, and presentation-only exports.
- Unreachable component branches or obsolete visual states.
- Unused component props, variants, slots, icons, and style constants.
- Stale Tailwind/CSS rules and commented-out JSX.
- Unused images, fonts, and other presentation assets.
- Superseded duplicate components after consolidation.

Require evidence before removal. Search the whole repository and account for barrel exports, dynamic imports, route registration, tests, generated references, and string-based asset use. Treat uncertain items as candidates, not confirmed dead code. Do not label unused domain types, model methods, hooks, API fields, or backend paths as UI dead code.

## Work mode

- If asked to review, report findings and do not edit.
- If asked to refactor, implement the smallest coherent consolidation and remove only confirmed dead UI code.
- If the request is ambiguous, default to a review with a prioritized consolidation plan.

For implementation:

1. Preserve existing public behavior and accessible names.
2. Update all affected consumers in the same change.
3. Delete superseded UI code only after repository-wide reference checks.
4. Avoid opportunistic non-UI cleanup.
5. Add or update tests when behavior or component contracts change; class-only consolidation usually does not require new tests.
6. Run the narrowest relevant tests, then `npm run lint` and `npm run build` for shared or route-level UI changes.

## Prioritize

Rank opportunities by:

1. Number and importance of affected screens.
2. Risk of visual or interaction drift.
3. Maintenance cost of making the next UI change.
4. Confidence that the shared concept is stable.
5. Safety and certainty of dead-code removal.

Prefer a small refactor with clear ownership over a sweeping component-system rewrite.

## Report results

For reviews, use:

```markdown
# UI/UX Simplification Review

## Summary
<Scope, dominant duplication, and highest-leverage opportunity.>

## Consolidation opportunities
1. `<file>:<line>` and `<file>:<line>` — <shared concept and evidence>. Recommendation: <single source of truth and migration boundary>.

## Confirmed dead UI code
1. `<file>:<line>` — <item and repository-wide reachability evidence>. Recommendation: <safe removal>.

## Uncertain candidates
1. `<file>:<line>` — <why it may be dead and what prevents confirmation>.

## Out of scope
<Non-UI findings intentionally left unchanged.>

## Recommended next step
<The smallest highest-value refactor.>
```

For implementations, summarize the new source of truth, migrated consumers, removed UI code, preserved UX contracts, and verification results. Explicitly say when no safe consolidation or dead code was found.

## Boundaries

- Use `ui-ux-refactoring-reviewer` for a broad visual-coherence or UX-consistency audit without a primary simplification goal.
- Use `web-design-reviewer` for screenshot-based visual inspection or browser layout QA.
- Use `simplicity-review` for maintainability work that includes hooks, models, domain logic, or non-UI architecture.
- Use `frontend-design` for new interface design rather than consolidation of existing UI.
