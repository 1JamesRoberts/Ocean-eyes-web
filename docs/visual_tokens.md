# OceanEyes Flutter visual tokens

The committed Flutter token catalogue is authoritative. Values are centralized
in `lib/core/theme/oceaneyes_tokens.dart`; screen widgets should not introduce
duplicate raw palette or shell geometry values.

## Reference geometry

| Role | Flutter logical pixels | Design reference |
|---|---:|---|
| Reference canvas | 393 × 852 | Primary visual target |
| Hero action space | 393 × 221 | Shared hero geometry |
| Hero fade extension | 56 | Shared fade geometry |
| Rounded viewport top | 213 | Authored viewport geometry |
| Content gutter | 16 | Main content gutter |
| Card radius | 28 | Glass card token |
| Inline radius | 12 | Inline surface token |
| Navigation | x 16, h 64, bottom ≥ 12 | Pill navigation token |
| Navigation radius | 32 | Pill navigation token |
| Minimum effective target | 48 | Flutter accessibility adaptation |

Flutter logical pixels map 1:1 to the reference pixels at the authored size.
Safe-area values are added only outside the locked authored dimensions.

## Semantic palette

| Role | Value |
|---|---|
| Canvas / Azure Mist | `#F4FFFE` |
| Inverse / Prussian Blue | `#051E32` |
| Accent / Verdigris | `#32A198` |
| Data secondary / Turquoise | `#00C8B3` |
| Data highlight / Neon Ice | `#00FFE5` |
| Navigation active / Dark Cyan | `#00645A` |
| Border / Pearl Aqua | `#9BCBC7` |
| Muted text / Slate Grey | `#828E97` |
| Good | `#10B981` |
| Warning | `#F59E0B` |
| Critical | `#EF4444` |

For normal-size text on pearl and white surfaces, Flutter uses darker
accessibility foreground variants: muted `#5F6D76`, good `#047857`, warning
`#8A4B00`, and critical `#B42318`. Each exceeds WCAG AA contrast against the
app canvas. The brighter accent tokens remain unchanged for decorative fills,
chart marks, status dots, and alert stripes; this is an intentional, documented
accessibility exception to literal color parity.

## Glass recipes

- Card: Azure Mist at 42%, 2px blur, Pearl Aqua at 72%, 1px border,
  28px radius, white/aqua directional highlight.
- Overlay: white at 40%, 12px blur, white at 30% border, 28px radius.
- Inline surface: white at 20–30%, 6px conceptual blur, 12–16px radius.
- Navigation: white at 30%, 15px blur, white at 35% border, Prussian Blue
  shadow at 10%.

Flutter has no built-in inset `BoxShadow`, so `GlassCard` reproduces the three
authored inset highlights with a restrained directional gradient and an outer
shadow. This is a reviewed rendering exception, not a new token.

## Typography

The exact Google Fonts Inter variable and italic font files are bundled under
`assets/fonts/`; runtime font downloading is disabled by construction.

| Role | Size / line height | Weight |
|---|---|---:|
| Section | 24 / 1.15 | 700 |
| Title | 16 / 1.30 | 600 |
| Strong | 15 / 1.35 | 600 |
| Body | 15 / 1.45 | 400 |
| Caption | 13 / 1.35 | 500 |
| Navigation | 10 / 1.0 | 600 |

Base tracking is `-0.15px`. Hero eyebrows use 12px/600 with 1.32px tracking.

## Motion and fade

- Shared transition: 250ms, cubic `(0.4, 0, 0.2, 1)`.
- Sheet: 180ms ease-out.
- Fade: 200ms ease-out.
- Donut: 480ms, cubic `(0.22, 1, 0.36, 1)`.
- Hero mask: 100% through 70%, 70% at 76%, 20% at 85%, 10% at 94%,
  transparent at 100%.

`MediaQuery.disableAnimations` reduces all authored motion to zero duration and
freezes decorative fish motion.
