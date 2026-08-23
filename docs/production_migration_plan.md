# Production integration migration plan

This plan was produced after comparing the current Flutter application with
`YoYo-XYZ/ocean-eyes` at `dev-main` commit
`0aae6ec10011741da4e22d36f214eb6dd458b132`.

The current application remains the source of truth for UI, navigation, MVVM,
fixtures, and tests. The legacy branch is used only as the source of truth for
production behavior and the deployed Firestore compatibility schema.

## Non-negotiable contracts

- Keep `OceanEyesController()` synchronous and safe without Firebase as the
  test-double injection seam.
- Keep `OceanEyesApp(controller: ...)` as the widget-test injection seam.
- The shipped application runtime always uses the production composition root;
  deterministic fixture scenarios are constructed directly by tests and must
  initialize no Firebase, camera, messaging, LiveKit, or ONNX service.
- Keep existing controller fields and commands consumed by the UI. Production
  adapters update those fields behind the controller instead of entering
  widgets directly.
- Keep SharedPreferences repositories as local cache/preferences. Firestore is
  a separate asynchronous, tank-scoped repository.
- Never commit generated Firebase configuration, Google service files,
  LiveKit credentials, `.env` files, APNs keys, or ONNX model binaries.

## File-level source-to-target map

| Legacy production source | Current/target file | Migration action |
| --- | --- | --- |
| `lib/main.dart` | `lib/main.dart`, `lib/app/oceaneyes_bootstrap.dart` | Make Firebase/App Check/auth startup the application composition root; leave system UI and app construction intact. |
| `lib/services/auth_service.dart` | `lib/integrations/firebase/firebase_auth_gateway.dart` | Replace legacy auth with mandatory Google sign-in, unsupported-session cleanup, and token-safe sign-out behind an injectable gateway. |
| `lib/services/firestore_service.dart` | `lib/integrations/firebase/firestore_oceaneyes_repository.dart` | Split raw Firestore access from mappings; expose typed streams/commands, not snapshots. |
| Firestore factories in `lib/models/mock_data.dart` | `lib/integrations/firebase/firestore_schema_mapper.dart` | Replace snapshot factories with explicit, tolerant mappings to current `FishEntry`, `AlertItem`, `HistoryReading`, water metrics, and analytics projections. |
| QR parsing in `lib/screens/onboarding/qr_scan_screen.dart` | `lib/models/tank_pairing_codec.dart`, `lib/ui/widgets/tank_pairing_sheet.dart` | Preserve v1 JSON compatibility, add typed validation/manual entry, and invoke pairing through the controller without copying legacy visuals. |
| Camera orchestration in `lib/screens/monitor/monitoring_screen.dart` | `lib/integrations/camera/camera_capture_gateway.dart` | Extract permission, lifecycle, lens switching, frame capture, ROI cropping, and single-flight behavior. |
| `lib/services/ml_service.dart` | `lib/integrations/ml/onnx_fish_inference_native.dart`, `lib/integrations/ml/onnx_fish_inference_stub.dart`, `lib/integrations/ml/onnx_fish_inference.dart` | Port tensor preprocessing and inference; add platform guards and retain both FNU and legacy clarity score. |
| `lib/services/notification_service.dart` | `lib/integrations/firebase/firebase_notification_service.dart` | Port permission, foreground/background handlers, token registration/refresh, and notification-open routing. |
| `lib/services/live_service.dart` | `lib/integrations/livekit/livekit_gateway.dart` | Port token retrieval, room lifecycle, publish/subscribe tracks, and clean camera handoff. |
| `lib/screens/viewer/live_screen.dart` | `lib/ui/widgets/aquarium_hero.dart` | Narrowly select a local camera or remote LiveKit surface inside `AquariumStreamImage`; retain all existing masks/filters/overlays. |
| `functions/src/index.ts` | `functions/src/index.ts` | Port alert evaluation/push and token minting; add App Check support, transactions, least-privilege grants, and new/legacy clarity compatibility. |
| `firestore.rules`, `firestore.indexes.json` | same paths | Port and harden role/field permissions; retain required compound indexes. |
| Android Gradle/manifest files | current Android files | Add conditional Firebase configuration, notification permission, min SDK/no-compress requirements, and keep the current application ID/UI settings. |
| No legacy iOS/web implementation | current `ios/` and `web/` | Add documented platform setup and guarded implementations; unsupported ML must report unavailable rather than break builds. |
| `assets/models/README.md`, setup docs | `assets/models/README.md`, `docs/production_setup.md` | Document exact model names/I/O and all external configuration without adding the binaries or credentials. |

## Typed schema and mapping rules

The compatibility layer reads the deployed legacy schema and writes additive
fields for the current app. It never assumes the current presentation models
match Firestore one-to-one.

### Fish inventory

`tank_fish/{docId}` maps as follows:

- document ID -> `FishEntry.id`
- `species_id` -> normalized classifier ID through
  `ClassifiableSpeciesCatalog.resolveId`
- catalog metadata -> `name`, `scientificName`, `assetPath`, compatibility,
  and care level; legacy `name` is only a fallback
- `count` -> integer clamped to 1–99
- `detected` -> integer clamped to 0–count
- local-only `visible` remains a presentation preference

Remote writes retain legacy `name` and `emoji` fields and add no UI-specific
metadata to Firestore.

### Readings, history, and analytics

The legacy `readings.clarity` value is a 1–10 clarity score. It must not be
shown as FNU. New writes store:

- `clarity`: legacy 1–10 score for deployed clients/functions
- `clarity_score`: explicit 1–10 score
- `turbidity_fnu`: raw water-clarity inference in FNU
- existing `fish_count`, `fish_count_confidence`, `species_detected`, and
  `frame_url`
- optional water chemistry and normalized detections when available

Mappings are:

- `HistoryReading.clarity` <- clarity score (1–10)
- dashboard `WaterMetric('Turbidity')` <- `turbidity_fnu`
- analytics clarity percentage <- clarity score multiplied by ten
- fish analytics <- timestamped `species_detected`, never document order

Seed readings with zero clarity and pending server timestamps are excluded
from history/analytics but can initialize live state.

### Alerts

`alerts/{docId}` uses `type` to derive the current title, maps message/tip to
message/action plan, converts severity to `AlertSeverity`, formats time from a
retained timestamp and injected clock, maps nullable context fields to the
before/after strings, and preserves `resolved`. Unknown types and severities
fall back safely.

### Tank, user, live state, and thresholds

- Tank/user/live document IDs remain the canonical IDs.
- Missing nested maps, pending timestamps, and both integer/double numeric
  values are accepted.
- Current `clarityThreshold` is `thresholds.turbidity_fnu_max`.
- Legacy `thresholds.clarity_min` remains readable/writable through the model's
  documented FNU/score conversion.
- Current `visibleFishThreshold` maps to legacy
  `thresholds.fish_change_pct`.
- `calibration.water_line_y` remains normalized 0–1.
- FCM reads both `fcm_token` and `fcm_tokens`; new writes use the array and
  retain the single field during compatibility rollout.

## Phases

### 1. Production dependency/configuration setup

- Add compatible Firebase, camera, QR, ONNX, LiveKit, permissions, and image
  dependencies.
- Add production runtime configuration and composition with emulator support;
  keep plugin-free fixture paths in injected test doubles.
- Add conditional native Firebase Gradle wiring and platform permissions.
- Add credential/model ignores and setup documentation.

Exit: ordinary fixture tests and a credential-free web build still compile;
the application reports missing configuration until launched with private
defines or emulators.

### 2. Auth and tank pairing

- Start unauthenticated unless Firebase restores a Google-backed session.
- Require direct Google sign-in before binding protected data and enforce the
  provider claim in Firestore rules and callable functions.
- Add v1 QR codec, scanning/manual entry, linked-tank selection, and safe unlink.

Exit: controller tests cover unauthenticated startup, Google sign-in/sign-out,
provider rejection, malformed QR, missing tank, and unlink behavior.

### 3. Firestore repositories and controller integration

- Add typed records/mappers and tank-scoped repository streams.
- Bind/cancel streams in the controller while retaining synchronous test
  doubles and optimistic UI mutations.
- Persist inventory, alert resolution, tank name, thresholds, calibration,
  settings, readings, users, and live state remotely.

Exit: mapper and fake-gateway controller tests cover coercion, sorting,
subscription replacement, disposal, and write failure rollback/error state.

### 4. Camera and ML pipeline

- Extract camera lifecycle and capture with permission/unavailable states.
- Port detector, classifier, and clarity model preprocessing and outputs.
- Run one inference at a time, crop below the calibrated water line, map the
  exact 24 classifier labels, and write both new and legacy reading fields.
- Use guarded stubs where ONNX Runtime is unsupported.

Exit: model-free tests validate preprocessing/mapping; configured physical
devices can capture and publish a real inference result.

### 5. Alerts, FCM, and Cloud Functions

- Port notification registration and deep-link payload handling.
- Port/harden callable alert evaluation, add retry-enabled reading evaluation,
  and deliver multicast push through a server-only durable outbox.
- Port indexes and least-privilege rules; add emulator/unit tests.

Exit: alert thresholds are evaluated transactionally, duplicate alerts are
suppressed, and notification payloads route to the current alert detail flow.

### 6. LiveKit streaming

- Mint short-lived server tokens only for tank members.
- Grant viewers subscribe-only and monitor devices publish permission.
- Use stable participant identities, persist revocation records server-side,
  and revoke them before owner-authorized tank deletion.
- Coordinate camera ownership between capture/ML and LiveKit publishing.
- Track viewer requests without relying on one lossy global boolean.

Exit: fake gateway tests and a configured two-device smoke flow cover connect,
track selection, disconnect, heartbeat, and retry.

### 7. Device/web validation and cleanup

- Run formatting, static analysis, unit/widget tests, existing visual matrix,
  Functions build/tests, and credential/model hygiene checks.
- Build web and Android without private configuration; perform configured
  Android/iOS/web smoke checks where credentials/hardware exist.
- Record any hardware- or console-dependent validation that cannot run locally.

Exit: test-fixture presentation is unchanged, production setup is
reproducible, and no credentials or large models are tracked.

## Known legacy behavior intentionally not copied verbatim

- Raw Firestore snapshots and Firebase SDK types do not enter widgets/models.
- Viewers cannot mutate tank ownership or publish LiveKit tracks.
- Tank creation and cascading changes are awaited or handled server-side.
- Alert suppression/creation is transactional rather than race-prone.
- QR payload validation is explicit; the v1 bearer-code risk is documented.
- `firebase_storage` is not added while `frame_url` remains unused.
- Mock calibration preview, no-op recalibration, and local-only notification
  toggles are not presented as completed production features.
