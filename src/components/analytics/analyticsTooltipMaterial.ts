import type { CSSProperties } from 'react';

/**
 * Shared translucent material for Recharts analytics tooltips.
 *
 * Keep the RGBA background explicit: Recharts supplies an opaque
 * `backgroundColor: #fff` default, so an unsupported `color-mix()` shorthand
 * would silently reveal that fallback and make the tooltip look solid.
 * Do not add backdrop blur here: the chart should stay crisp and visible
 * through the translucent surface instead of being frosted underneath it.
 */
export const analyticsTooltipMaterialStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.7)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  borderRadius: '1rem',
  fontSize: 13,
} satisfies CSSProperties;
