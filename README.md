# OceanEyes Flutter

OceanEyes is a Flutter aquarium-monitoring client for Android, iOS, and Flutter
web. The app targets a 393 × 852 portrait canvas and includes a persistent
aquarium hero, glass cards, four-tab pill navigation, monitoring screens,
camera-control states, Alerts, and History.

## Run

OceanEyes has two supported workflows. Dev mode is the deterministic local
preview and does not require Firebase credentials or camera hardware. The
customer mode is built as a release artifact with the private production
configuration.

```powershell
flutter pub get
flutter run -d edge
```

For the customer release, copy `config/production.example.json` to a secure
location outside the repository, replace its placeholders with the intended
Firebase values, keep `OCEANEYES_PRODUCTION` set to `true`, and build the
target artifact with that private configuration:

```powershell
flutter build web --release --dart-define-from-file=C:\secure\oceaneyes-production.json
flutter build appbundle --release --dart-define-from-file=C:\secure\oceaneyes-production.json
flutter build ipa --release --dart-define-from-file=C:\secure\oceaneyes-production.json
```

The Firebase emulator configuration is internal engineering/test
infrastructure and is not a third app mode. Deterministic fixtures can be
selected with `?fixture=...` in Dev mode.

Common validation commands:

```powershell
flutter analyze
flutter test
```

The visual test harness supports deterministic fixture scenarios documented in
[`docs/visual_validation.md`](docs/visual_validation.md); the shipped web app
is not launched with those fixture URLs.

## Architecture

```text
lib/
  app/           MaterialApp and Navigator page stack
  core/theme/    OceanEyes visual tokens and Flutter theme
  models/        Domain entities, repositories, and test fixtures
  view_models/   App state, transitions, persistence, route intent
  ui/screens/    Route/tab content
  ui/shell/      Persistent hero, scroll viewport, navigation
  ui/widgets/    Glass primitives, charts, hero, controls
```

`OceanEyesController` remains the public state API consumed by screens, but it
is now a compatibility facade over responsibility-focused coordinators:

- `OceanEyesNavigationCoordinator` owns route state and one-shot UI intents.
- `OceanEyesPersistenceCoordinator` owns serialized local repository writes.
- `OceanEyesFixtureCoordinator` builds deterministic fixture snapshots.
- `OceanEyesProductionBindingCoordinator` owns auth, FCM, and subscriptions.
- `OceanEyesCameraCoordinator` owns camera/ML lifecycle and inference timing.
- `OceanEyesLiveSessionCoordinator` owns LiveKit sessions and request leases.
- `OceanEyesWakeLockCoordinator` arbitrates camera and live wake-lock claims.

Models contain no Flutter widget dependencies. UI files own rendering and event
wiring, while pure model services derive care and chart data.

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

The production runtime uses anonymous Firebase Auth with optional Google
linking, typed Firestore repositories and schema mappers, QR tank pairing,
camera capture, an on-device three-model ONNX pipeline, FCM, Cloud Functions
alerting, and LiveKit streaming. The default local preview keeps those
services disabled and uses deterministic fixture state instead.

The current cross-device and recovery evidence is recorded in
[`docs/current_state_validation.md`](docs/current_state_validation.md). It
includes a credential-free two-controller synchronization proof and clearly
separates physical Firebase/LiveKit/device checks that still require staging.

No Firebase configuration, API credentials, APNs keys, or ONNX binaries are
tracked. Follow [`docs/production_setup.md`](docs/production_setup.md) to
configure an environment. The audited source-to-target migration and exact
legacy schema mappings are in
[`docs/production_migration_plan.md`](docs/production_migration_plan.md).

## Visual parity

- Token catalogue: [`docs/visual_tokens.md`](docs/visual_tokens.md)
- Screenshot matrix and diff workflow:
  [`docs/visual_validation.md`](docs/visual_validation.md)
