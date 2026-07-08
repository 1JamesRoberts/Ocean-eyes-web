---
name: ui-ux-refactoring-reviewer
description: Review React/TypeScript UI code for refactoring opportunities that improve visual coherence, UX consistency, component reuse, and Tailwind design-system discipline. Use this skill whenever the user says the app feels visually inconsistent, incoherent, messy, uneven, duplicated, hard to scan, or asks to review/refactor UI/UX components in this Vite + React + Tailwind project, even if they do not explicitly say "design system".
---

# UI/UX Refactoring Reviewer

Use this skill to inspect UI code and identify refactoring opportunities that make the interface feel more coherent, consistent, and maintainable. This is a code-level review skill: it complements visual browser QA, but does not require screenshots unless the user asks for fixes or visual verification.

## Default stance

Review first. Do not edit files unless the user explicitly asks you to apply the refactor. The main output should be a prioritized findings report with concrete file and line references.

When the user asks to implement fixes, keep changes scoped and prefer the project's existing shared components and Tailwind utility patterns over creating a new styling layer.

## Project context

OceanEyes is a mobile-first React 19 + TypeScript 6 + Vite 8 dashboard for AI aquarium monitoring.

Respect the project's MVVM boundaries:

- Hooks own state, side effects, and lifecycle.
- Models own persistence, transport, API access, and pure domain helpers.
- UI components own JSX, Tailwind classes, and event wiring.

Tailwind CSS v4 is the preferred styling system. Avoid custom CSS unless the value cannot reasonably be expressed with utilities or existing tokens.

## Review workflow

1. Identify scope.
   - If the user names files, review those files and directly related shared components.
   - If the user asks about the whole app, start with `src/pages/`, `src/components/shared/`, and the feature component folders that render the main screens.
   - For changed-code reviews, inspect the diff first, then read the surrounding components.

2. Map repeated UI patterns.
   - List shared primitives in `src/components/shared/`.
   - Identify repeated card shells, headers, empty states, action rows, badges, modals, sheets, form controls, metric tiles, chart panels, and navigation patterns.
   - Check whether similar UI is implemented through shared components or copied Tailwind strings.

3. Audit visual coherence from code.
   - Compare spacing scales, border radii, shadows, translucency, blur, borders, text sizes, icon sizes, and color choices across similar components.
   - Look for one-off arbitrary Tailwind values that encode design decisions locally.
   - Flag mismatched hierarchy: hero-scale typography inside dense panels, tiny labels used as major headings, or repeated competing emphasis.
   - Flag inconsistent interaction states: hover, active, disabled, selected, focus-visible, loading, and empty states.

4. Audit UX consistency.
   - Check whether the same action appears with different labels, icons, placement, or confirmation behavior.
   - Check whether navigation, sheets, modals, disclosures, filters, date/time pickers, and selection controls behave consistently.
   - Check touch ergonomics for mobile: target size, sticky controls, thumb reach, overflow, scroll traps, and cramped tap rows.
   - Check data-state consistency: loading, empty, error, stale, offline, permission-denied, and no-results states.

5. Audit component APIs.
   - Flag shared components that expose too many styling escape hatches or boolean variants.
   - Flag feature components that should consume shared primitives but instead recreate them.
   - Flag shared primitives that are too narrow, naming-specific to one page, or leaking feature concerns.
   - Prefer small, composable primitives for stable UI patterns. Avoid abstraction when only one call site exists and no repeated pattern is emerging.

6. Audit Tailwind maintainability.
   - Flag large conditional class strings that obscure state logic.
   - Flag duplicated utility clusters that should become a shared component or local helper.
   - Prefer existing shared components before introducing a new helper.
   - Keep Tailwind class changes local to JSX unless a reusable token or primitive clearly pays for itself.

7. Prioritize by user impact and refactor leverage.
   - High: inconsistent patterns that affect many screens, mobile usability, accessibility, or make future UI work expensive.
   - Medium: duplicated UI clusters, inconsistent states, unclear component boundaries, or one-off style values that are spreading.
   - Low: cosmetic inconsistencies with limited blast radius.

## What to look for

### Visual-system drift

- Similar cards use different padding, radius, border opacity, background opacity, or shadow treatment.
- Heading, label, caption, and metric text sizes vary without semantic reason.
- Icon buttons use different dimensions, icon sizes, hit areas, or disabled styles.
- Color accents are picked per component instead of following a small set of semantic roles.
- Glass, gradient, or translucent surfaces are applied inconsistently.

### UX pattern drift

- Filters, pickers, and sheet controls use different layout rules between pages.
- Destructive, primary, and secondary actions look too similar or move between screens.
- Empty/error/loading states are missing or visually unrelated.
- Similar data cards order information differently, making scanning harder.
- Mobile layouts require excessive scrolling because repeated panels are over-framed.

### Component refactoring opportunities

- Repeated `section` or `article` shells can become a shared panel/card primitive.
- Repeated title + subtitle + action clusters can use `CardHeader` or a small composition pattern.
- Repeated badges/chips should use `GlassBadge`, `DetailChip`, or a renamed shared primitive if the concept is broader.
- Repeated icon-only controls should use `GlassIconButton` or a consistent button primitive with accessible labels.
- Feature components with copied state-specific UI can extract focused subcomponents only when the pattern appears at least twice.

### Accessibility and interaction debt

- Icon buttons without accessible labels.
- Clickable non-buttons or controls missing keyboard/focus behavior.
- Focus-visible styles missing from interactive elements.
- Touch targets below roughly 44px in dense mobile surfaces.
- Text contrast that is likely weak because of opacity stacking or translucent surfaces.

## Output format

Use this report shape unless the user requests a different format:

```markdown
# UI/UX Refactoring Review

## Summary
<2-4 sentences covering scope, dominant consistency problem, and highest-leverage refactor.>

## Findings

### High impact
1. `<file>:<line>` - <issue>. <why it hurts UI coherence or UX>. Recommendation: <specific refactor>.

### Medium impact
1. `<file>:<line>` - <issue>. <why it matters>. Recommendation: <specific refactor>.

### Low impact
1. `<file>:<line>` - <issue>. <why it matters>. Recommendation: <specific refactor>.

## Shared primitives to reuse or adjust
<Short list of existing shared components and what role each should play.>

## Recommended next step
<The single highest-value refactor to make first.>
```

If there are no meaningful issues, say that clearly and mention any residual risk, such as not having done a visual screenshot pass.

## Implementation guidance when asked to fix

- Make the smallest coherent refactor that improves repeated UI, not a broad redesign.
- Preserve current user flows and page structure unless the user explicitly asks for UX redesign.
- Prefer updating or extending existing shared components in `src/components/shared/`.
- Keep feature-specific copy, data mapping, and layout ownership in feature/page components.
- Add or update tests only when behavior changes. Pure className consolidation usually does not need tests.
- Run `npm run lint` and `npm run build` when the changes affect shared UI or route-level screens.

## Boundaries

- Use `web-design-reviewer` instead when the user specifically asks for screenshot-based visual QA, layout breakage inspection, or browser verification.
- Use `frontend-design` instead when the user asks to design or build a new UI from scratch.
- Use `simplicity-review` instead when the request is general maintainability without a UI/UX consistency focus.
- Do not recommend a new design-token system unless repeated code shows that local Tailwind utilities and existing shared components are no longer enough.
