# Mobile Rounded Content Corners

## Goal

Keep the mobile viewer content background visually rounded where it meets the black camera hero, while keeping the rounded corners fixed during scroll and ensuring black shows behind the corners.

## Optimized Approach

- Mobile shell geometry is centralized in `src/index.css`:
  - `--mobile-frame-width`
  - `--mobile-status-bar-height`
  - `--mobile-hero-height`
  - `--mobile-content-radius`
  - `--mobile-content-gutter`
- `src/components/shared/PhoneFrame.tsx` owns the phone chrome: status bar, scrollable rounded content shell, and the navigation slot.
- `src/components/shared/ScreenWithHeroVideo.tsx` derives the sticky hero height, sticky corner overlay position, and corner cutout size from those shell variables.
- The hero/content boundary uses the black page/video background as the backing layer.
- The scrolling content remains a normal `bg-gradient-mint` block, so cards can scroll naturally under the fixed boundary.
- The sticky overlay renders only two corner cutouts using named CSS utilities, avoiding inline radial gradients and duplicated radius values.
- Hero action controls use a React-owned hero action layer context instead of a global DOM id lookup.

## Why This Works

The rounded corner is no longer part of the scrolling content, so it does not move away when the user scrolls. The overlay also avoids drawing a full-width mint strip, which prevents the visible bar and square artifacts that appeared in earlier attempts.

The geometry is now tokenized, so changes to the hero height, phone width, content radius, or content gutter do not require syncing JSX classes with inline styles.

## Current Radius

The corner radius is `20px`. If the design needs more or less roundness, update `--mobile-content-radius` in `src/index.css`.
