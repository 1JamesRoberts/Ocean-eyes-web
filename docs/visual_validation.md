# Visual validation workflow

## Deterministic fixtures

Flutter web accepts fixture and destination query parameters, which are also
usable in screenshot automation:

```text
/?fixture=populated
/?fixture=dashboard_waiting
/?fixture=dashboard_warning
/?fixture=fish_empty&tab=my_fish
/?fixture=analytics_loading&tab=analytics
/?fixture=analytics_empty&tab=analytics
/?fixture=analytics_error&tab=analytics
/?fixture=camera_permission&tab=account
/?fixture=camera_denied&tab=account
/?fixture=camera_unavailable&tab=account
/?fixture=alerts_empty&route=alerts
/?fixture=history_empty&route=history
/?route=alerts&alert=alert-turbidity
```

Supported `tab` values are `dashboard`, `my_fish`, `analytics`, and `account`.
Supported routes are `alerts` and `history`.

The default populated fixture is fixed to 31 July 2026 data, the complete
541-entry mobile-ui species catalog, and bundled local media. It does not
depend on a camera, backend, locale-specific network data, or current time.

## Capture matrix

Run the integration matrix on a connected Android device or emulator:

```powershell
flutter test integration_test/visual_matrix_test.dart -d <device-id>
```

The test locks the surface to 393 × 852 logical pixels and names captures as:

```text
393x852__<screen>__<state>.png
```

It covers Dashboard waiting/healthy/warning/no-alerts; My Fish empty/populated/
expanded, add-species, count adjustment, and delete confirmation; Analytics
loading/empty/error/populated plus the species, calendar, and time-wheel
selectors; Account permission/denied/unavailable/active, AI-disabled,
turbidity-measuring, fullscreen, fullscreen inventory, and all three source
settings disclosures; Alerts empty/list/detail/resolved; and History
empty/populated.

Global captures exercise a 280px keyboard inset, 47px top and 34px bottom safe
areas, 1.6x platform text scaling, and reduced-motion accessibility settings.
The capture helper intentionally advances a bounded number of frames so finite
route, sheet, and chart transitions settle deterministically.

## Compare

Select an approved 393 × 852 baseline capture, then run:

```powershell
dart run tool/compare_screenshots.dart `
  path/to/baseline.png `
  path/to/candidate.png `
  build/visual-diff/dashboard-waiting
```

The tool requires exact matching dimensions and emits a reference/candidate
side-by-side image, an alpha overlay, a 4× amplified RGB difference image,
mean absolute error, and the percentage of pixels with a channel delta above 12.
Geometry, wrapping, opacity, font baselines, blur, icon placement, and chart
plot bounds still require human review; the scalar metric is not a pass/fail
substitute.

## Reviewed platform exceptions

- Flutter font rasterization differs slightly between CanvasKit/Skia/Impeller
  and the browser even with the same Hanken Grotesk outlines.
- The authored 54 px phone status bar is part of the locked comparison surface;
  native OS chrome is outside device-surface captures.
- Flutter does not expose CSS inset box shadows. The reference's inset-only
  highlight on solid white cards is visually neutral; translucent overlays use
  the matching blur, border, and exterior shadow values.
- The screenshot fixture uses `assets/images/aquarium_hero.png`; production
  camera frames are intentionally frozen during comparison.

## Smoke sizes

In addition to 393 × 852, run widget or device smoke checks at 360 × 640 and
430 × 932. Verify no overflow, inaccessible bottom controls, keyboard-covered
search fields, or off-screen confirmation actions. Tablet layout is out of
scope for the first release.
