import type { CSSProperties } from 'react';

/**
 * Shared translucent material for Recharts analytics tooltips.
 *
 * Keep the RGBA background explicit: Recharts supplies an opaque
 * `backgroundColor: #fff` default, so an unsupported `color-mix()` shorthand
 * would silently reveal that fallback and make the tooltip look solid.
 */
export const analyticsTooltipMaterialStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.7)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  borderRadius: '1rem',
  fontSize: 13,
} satisfies CSSProperties;
