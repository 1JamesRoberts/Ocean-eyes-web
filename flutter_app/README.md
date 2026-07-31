# OceanEyes Flutter

Mobile Flutter conversion of the OceanEyes React prototype. The app targets a
393 × 852 portrait canvas and preserves the persistent aquarium hero, glass
cards, four-tab pill navigation, monitoring screens, camera-control states,
Alerts, and History.

## Run

```powershell
flutter pub get
flutter run
```

Common validation commands:

```powershell
flutter analyze
flutter test
flutter build web --release
flutter build apk --debug
```

The web build supports deterministic fixture URLs documented in
[`docs/visual_validation.md`](docs/visual_validation.md).

## Architecture

```text
lib/
  app/           MaterialApp and Navigator page stack
  core/theme/    CSS-derived tokens and Flutter theme
  models/        Domain entities and deterministic fixtures
  view_models/   App state, transitions, persistence, route intent
  ui/screens/    Route/tab content
  ui/shell/      Persistent hero, scroll viewport, navigation
  ui/widgets/    Glass primitives, charts, hero, controls
```

The view model is the public state API consumed by screens. Models contain no
React or widget dependencies. UI files own rendering and event wiring.
Model-layer `SharedPreferences` repositories persist user-adjustable inventory
and visual/AI settings, while pure model services derive care and chart data.

Primary tabs do not push routes; they reset the shared screen scroller. Alerts,
alert detail, and History are real Navigator pages, so Android back and iOS back
gestures unwind the same origin-aware route stack as visible back controls.

## Implemented state coverage

- Dashboard: waiting, healthy, warning, populated inventory, active/no alerts.
- My Fish: empty/populated, expandable details, count stepper, visibility,
  searchable add sheet, delete confirmation.
- Analytics: loading, empty, error, populated charts, species/date/time custom
  controls, diagnostics.
- Account: permission/denied/unavailable/idle/active/processing/measurement,
  AI controls, fullscreen portrait inventory, thresholds, preferences, tank,
  stream, and visible Background Canvas debug controls.
- Alerts: empty, active/resolved list, detail, resolve.
- History: empty/populated clarity trend and recent readings.
- Global: 48dp targets, semantic chart summaries, reduced motion, safe areas,
  keyboard-safe sheets, responsive scrolling.

## Camera and backend boundary

This repository implements the frontend state machine with a frozen camera
fixture. The native project declares camera permissions and the UI auto-starts
its camera state after permission is granted, but hardware capture and model/
backend synchronization remain behind the unresolved production dependency
identified in the migration plan. Replace the fixture transition in
`OceanEyesController.requestCameraPermission` with the selected camera gateway
without changing screen APIs.

## Visual parity

- Token catalogue: [`docs/visual_tokens.md`](docs/visual_tokens.md)
- Screenshot matrix and diff workflow:
  [`docs/visual_validation.md`](docs/visual_validation.md)
