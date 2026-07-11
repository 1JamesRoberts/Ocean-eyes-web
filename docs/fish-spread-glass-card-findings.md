# Fish Spread glass-card findings

## Root cause

The Fish Spread tooltip already used the same Recharts styles as `main`. The visual mismatch came from `mobile-ui`'s global `glass-card` utility, which intentionally uses a flatter gradient and removes the main branch's backdrop blur.

## Scoped fix

Fish Spread now has its own `GlassCard`. Only that card restores the main-branch glass treatment:

- `--glass-bg-card`
- `--glass-blur-lg`
- `--glass-border-strong`
- `--glass-radius-card`
- `--shadow-glass` and `--shadow-card`

Fish Count and Fish Spread share this main-branch card treatment through one style definition. The Fish Spread tooltip remains the same implementation as `main`.

## Verification

`npm run build` completed successfully after the change.
