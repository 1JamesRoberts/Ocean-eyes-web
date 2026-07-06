---
name: simplicity-review
description: 'Review React/TypeScript code for refactoring opportunities that improve simplicity and maintainability. Use when asked to refactor, simplify, clean up, or review code for maintainability in this Vite + React + TypeScript project.'
---

# Simplicity Review

## When to use

Use this skill when the user asks you to:
- Review code for refactoring potential
- Simplify a component, hook, or utility
- Improve maintainability of a specific file or set of files
- Identify dead code, duplication, or unnecessary abstraction

## Procedure

1. **Identify the scope**: Determine whether the user is asking about specific files, current changes, or a pasted snippet. Keep the review tight to that scope.
2. **Read the code**: For file-based reviews, read the requested files plus one level of directly imported dependencies to understand boundaries and coupling.
3. **Run the quick checklist** against the code:
   - **Single Responsibility**: Does a function/component/hook do more than one thing? Can it be split?
   - **MVVM layering**: Does code respect the project's hook/model/UI split?
     - Hooks should own state, side effects, and lifecycle; they should not bypass models to do raw data access or persistence.
     - Models should contain data access, persistence, transport, and pure domain helpers; they should not import React or have UI/lifecycle side effects.
     - UI components should contain JSX, Tailwind classes, and event wiring; they should not own state that belongs in hooks or call model internals directly.
   - **Unnecessary abstraction**: Are there interfaces, generics, or wrappers with only one implementation?
   - **Dead code**: Are there unused exports, props, variables, or commented-out blocks?
   - **Duplication**: Is the same logic repeated in nearby code? Could a helper or early return remove it?
   - **Naming clarity**: Do names explain intent? Avoid `data`, `item`, `handleClick`, `utils`.
   - **Type complexity**: Are union types, mapped types, or generics more complex than the problem requires?
   - **React-specific smells**: Unnecessary `useEffect`, `useMemo`, or `useCallback`; prop drilling; state that could be derived; context for data that doesn't change globally.
   - **Tailwind/class clutter**: Inline conditional class strings that could be extracted or simplified.
4. **Prioritize findings**: Mark each finding as High, Medium, or Low impact. High-impact findings are those that will make the next change to this code disproportionately harder.
5. **Produce the report**: Output a concise findings report with file/line references and a one-sentence rationale for each. Do not apply edits unless explicitly asked.

## Output format

```markdown
# Simplicity Review

## Summary
<Brief summary of the scope and top-level takeaways>

## Findings

### High impact
1. `<file>:<line>` — <one-sentence description of the issue>

### Medium impact
1. `<file>:<line>` — <one-sentence description of the issue>

### Low impact
1. `<file>:<line>` — <one-sentence description of the issue>

## Recommended next step
<The single highest-value change to make next>
```

## What to skip

- Style-only issues (formatting, import order, quote style) — these are linter concerns
- Framework-required boilerplate (Vite config, React entry files, standard Tailwind setup)
- Domain complexity that legitimately requires complexity
