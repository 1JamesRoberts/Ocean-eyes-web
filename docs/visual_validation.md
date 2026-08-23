# Visual validation workflow

## Deterministic test fixtures

The shipped app is production-only. Screenshot automation constructs
`OceanEyesController` directly and uses these fixture query parameters only as
test-harness inputs:

```text
/?fixture=login
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

The default populated fixture is fixed to 31 July 2026 data, the exact ordered
24-class mobile-deploy classifier catalog, and bundled local media. It does not
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

It covers Login idle; Onboarding welcome/choice/join-manual/owner-success and the
limited no-tank dashboard; Dashboard waiting/healthy/warning/no-alerts; My Fish empty/populated/
expanded, add-species, count adjustment, and delete confirmation; Analytics
loading/empty/error/populated plus the species, calendar, and time-wheel
selectors; Account permission/denied/unavailable/active, AI-disabled,
turbidity-measuring, fullscreen, fullscreen inventory, and all three source
settings disclosures; Alerts empty/list/detail/resolved; and History
empty/populated.

Global captures exercise a 280px keyboard inset, 47px top and 34px bottom safe
areas, 1.6x platform text scaling, and reduced-motion accessibility settings.
The capture helper intentionally advances a bounded number of frames so finite
route, sheet, and chart transitions settle deterministically. Account coverage
also includes disconnected and pairing-sheet states so the shared pairing UX
and always-available visual settings remain in the visual matrix.

## Compare

For source-parity review, serve the `mobile-deploy` worktree and the release
Flutter web build on separate local origins. Capture both at an exact 393 × 852
browser viewport without lossy conversion. Store the reference, candidate, and
comparison artifacts under `build/mobile-deploy-comparison/`.

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

- Flutter font rasterization can differ by subpixel coverage between
  CanvasKit/Skia/Impeller and the browser even with the same bundled Inter
  outlines.
- Native OS chrome is outside device-surface captures; the authored web canvas
  begins at y=0 and does not include a synthetic status bar.
- CSS inset shadows are rendered as clipped highlight layers with matching
  color, extent, and opacity.
- The test screenshot fixture uses `assets/images/aquarium_hero.png`; production
  camera frames are intentionally frozen during comparison.

## Smoke sizes

In addition to 393 × 852, run widget or device smoke checks at 360 × 640 and
430 × 932. Verify no overflow, inaccessible bottom controls, keyboard-covered
search fields, or off-screen confirmation actions. Tablet layout is out of
scope for the first release.
