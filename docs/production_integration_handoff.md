# OceanEyes production integration: complete handoff

## Document purpose

This is the single, self-contained record of the production-layer migration
completed for OceanEyes. It combines the audit, file-level migration plan,
implementation decisions, schema compatibility rules, environment setup,
security hardening, test results, deployment instructions, and remaining
release checks.

The production source was the `dev-main` branch of
`YoYo-XYZ/ocean-eyes`, audited at commit:

```text
0aae6ec10011741da4e22d36f214eb6dd458b132
```

The integrated result was pushed directly to `origin/codex/flutter-frontend`
in these commits:

```text
36e9483  Implement aquarium monitoring dashboard experience
e13a22d  Record final production validation
```

The integration was validated on Windows on August 20, 2026.

## Outcome

The current Flutter application now uses a production runtime for:

- Firebase Core initialization and Firebase App Check.
- Anonymous Firebase Authentication and optional Google account linking.
- Account-collision recovery when an anonymous user links a Google identity
  that already belongs to another Firebase account.
- Firestore-backed tanks, readings, fish inventory, alerts, users, live state,
  live-view requests, remote thresholds, and camera calibration.
- Firebase Cloud Messaging registration, token refresh, foreground/background
  handling, and notification-open routing.
- Native camera permission, lifecycle, lens selection, capture, and water-line
  region-of-interest cropping.
- Web camera capture, lens selection, still capture, and zoom where supported.
- Native ONNX fish detection, species classification, and water-clarity
  inference.
- QR and manual tank pairing using the deployed version-1 payload format.
- LiveKit viewer and monitor sessions with role-scoped tokens, camera handoff,
  request leases, heartbeats, and stale-request cleanup.
- Cloud Functions for durable alert evaluation, FCM notification delivery,
  LiveKit token generation, identity revocation, and safe tank deletion.
- Firestore rules and indexes hardened around owner, monitor, viewer, and
  server-only responsibilities.
- Wake-lock ownership while a monitor performs periodic inference or publishes
  a live camera.

The existing UI, visual language, fixture matrix, synchronous controller
construction, MVVM boundaries, and presentation models remain the source of
truth. Production SDK objects do not enter widgets or presentation models.

## Sources of truth and preserved contracts

| Concern | Source of truth |
| --- | --- |
| UI, visual design, navigation, MVVM, fixtures, presentation models, tests | Current Flutter application |
| Firebase, Firestore compatibility, camera/ML behavior, FCM, LiveKit, Functions | Legacy `dev-main` production layer |

The following contracts were preserved:

1. `OceanEyesController()` remains synchronous and injectable.
2. `OceanEyesApp(controller: ...)` remains the widget-test seam.
3. The shipped application runtime always composes production services;
   deterministic fixture scenarios are constructed directly by tests and never
   initialize Firebase, camera, FCM, ONNX, LiveKit, or wake-lock plugins.
4. Existing controller fields and commands remain the state API consumed by
   widgets.
5. Existing deterministic fixtures continue to drive the visual matrix.
6. SharedPreferences remains the local preferences/inventory store used by
   fixture and local paths.
7. Firestore is exposed separately through asynchronous, tank-scoped streams
   and commands.
8. `lib/models/` continues to contain no Flutter UI imports.
9. Remote SDK snapshots, sentinels, and plugin types do not cross into the
   view-model or UI boundary.
10. No Firebase configuration file, credential, LiveKit secret, signing key,
    APNs key, App Check debug token, or ONNX binary is tracked.

## Architecture after migration

### Runtime composition

`bootstrapOceanEyesController()` is the composition root:

```text
private dart-defines and native service files
          |
          v
OceanEyesProductionConfig
          |
          -> validate platform configuration
          -> initialize Firebase and optional emulators
          -> activate App Check when enabled
          -> establish anonymous auth session
          -> construct typed production adapters
          -> inject adapters into OceanEyesController
          -> initialize production subscriptions
```

Deterministic fixtures remain a direct-controller test seam. If production
startup fails, the returned error controller clears restored fish, readings,
alerts, analytics, heatmap, tank calibration, tank identity, and turbidity
state. Cached/demo values are not exposed as live production data.

### MVVM and data boundaries

- `OceanEyesProductionConfig` reads and validates build-time configuration.
- `initializeOceanEyesFirebase()` owns Firebase/App Check/emulator startup.
- `ProductionAuthGateway` defines the authentication boundary.
- `ProductionOceanEyesRepository` defines typed Firestore streams and writes.
- `FirestoreSchemaMapper` explicitly translates the deployed schema into the
  current presentation/domain types.
- Camera, inference, notifications, LiveKit, and wake lock use independently
  injectable gateways.
- `OceanEyesController` retains the stable public API expected by current
  widgets. Navigation, fixtures, local persistence, production subscriptions,
  camera/ML, LiveKit, and wake-lock concurrency are delegated to independently
  testable coordinators behind it.

Firebase SDK types, Firestore snapshots, camera plugin types, ONNX Runtime
objects, and LiveKit room objects stay out of the UI.

### Production controller lifecycle

The production facade and its coordinators now:

- Watches auth state and rebinds user/tank subscriptions when the Firebase UID
  changes.
- Sorts and de-duplicates linked tank IDs before selecting an active tank.
- Cancels every old tank subscription before binding a new tank.
- Uses one `ProductionReadingBundle` stream for live reading, history, and
  analytics projections, avoiding three identical billed queries.
- Keeps local `FishEntry.visible` preferences when a remote fish snapshot
  updates counts or detected values.
- Applies only real timestamped, positive-clarity readings to the live
  dashboard; seed/pending readings do not make an uninitialized tank healthy.
- Serializes inventory, settings, general writes, auth rebinding, wake-lock
  transitions, camera operations, and LiveKit start/stop operations.
- Cancels auth, linked-tank, reading, fish, alert, live-state, live-request,
  camera, notification, heartbeat, and lease subscriptions/timers on disposal.
- Rebinds linked tanks after anonymous-to-Google account changes, including the
  credential-collision path into an existing Google account.

## File-level migration map

| Legacy source | Integrated target | Result |
| --- | --- | --- |
| `lib/main.dart` | `lib/main.dart`, `lib/app/oceaneyes_bootstrap.dart` | Production/local composition moved behind explicit runtime selection. |
| `lib/services/auth_service.dart` | `lib/integrations/firebase/firebase_auth_gateway.dart` | Anonymous-first auth, Google link, collision recovery, token detach, and tank rejoin are injectable. |
| `lib/services/firestore_service.dart` | `lib/integrations/firebase/firestore_oceaneyes_repository.dart` | Raw snapshots replaced by typed streams and tank-scoped commands. |
| Legacy Firestore model factories | `lib/integrations/firebase/firestore_schema_mapper.dart` | Explicit tolerant mappings to current models and analytics projections. |
| Legacy onboarding QR screen | `lib/models/tank_pairing_codec.dart`, `lib/ui/widgets/tank_pairing_sheet.dart` | Version-1 JSON compatibility, validation, scanning, and manual entry. |
| Legacy monitor camera orchestration | `lib/integrations/camera/*` | Native/web adapters, lifecycle, permission, capture, crop, lens ordering, and serialized operations. |
| `lib/services/ml_service.dart` | `lib/integrations/ml/*` | Detector, classifier, and clarity preprocessing/inference with native/stub exports. |
| `lib/services/notification_service.dart` | `lib/integrations/firebase/firebase_notification_service.dart` | FCM permission, registration, refresh, routing, and retry behavior. |
| `lib/services/live_service.dart` | `lib/integrations/livekit/livekit_gateway.dart` | Role-aware token acquisition, room lifecycle, publishing, subscription, and teardown. |
| Legacy live viewer screen | `lib/ui/widgets/aquarium_hero.dart` | Existing hero selects local camera or remote LiveKit media without a visual rewrite. |
| `functions/src/index.ts` | `functions/src/index.ts` and helpers | Durable alerts/outbox, LiveKit tokens/revocation, and safe tank deletion. |
| Legacy rules/indexes | Root `firestore.rules`, `firestore.indexes.json` | Compatibility retained with stricter roles, fields, tombstones, leases, and server-only data. |
| Legacy Android configuration | Current Android Gradle/manifest files | Conditional Google services, API 23, permissions, ONNX no-compress, and release signing policy. |
| No usable legacy web/iOS path | Current `web/` and `ios/` | Platform setup, web camera/FCM scaffolding, and guarded native-only ML. |

## Phase-by-phase implementation record

### Phase 1: production dependencies and configuration

Added these Flutter dependencies:

```text
firebase_core
firebase_app_check
firebase_auth
cloud_firestore
cloud_functions
firebase_messaging
google_sign_in
camera
permission_handler
mobile_scanner
qr_flutter
onnxruntime
image
livekit_client
wakelock_plus
```

Implemented:

- Opt-in production configuration through Dart defines.
- Conditional native Firebase configuration so credential-free builds work
  without service files.
- Android Play Integrity, Apple App Attest/DeviceCheck, and web reCAPTCHA v3
  App Check providers, plus explicit native debug providers.
- Optional Auth, Firestore, and Functions emulator connections.
- Android internet, camera, notification, and wake-lock permissions.
- Android API 23 minimum for LiveKit/WebRTC.
- Uncompressed Android `.onnx` assets for model access.
- iOS camera and remote-notification declarations.
- Credential/model/signing ignores and tracked placeholder configuration.

### Phase 2: authentication and tank pairing

Authentication behavior:

- Startup guarantees an anonymous Firebase session.
- Google sign-in first attempts to link that anonymous account.
- Cancellation preserves the anonymous session.
- If the credential belongs to an existing account, the gateway records the
  anonymous user's tanks, removes its FCM token, signs into the existing
  account, rejoins accessible tanks, and reports successful/failed tank IDs.
- Signing out removes the current token and creates a fresh anonymous session.
- Auth-state changes rebuild user and linked-tank streams.

Google OAuth behavior:

- Web uses `OCEANEYES_GOOGLE_WEB_CLIENT_ID` as client ID.
- Android uses the web OAuth client ID as `serverClientId`.
- iOS uses its iOS OAuth client ID and requires its reversed-client URL scheme.

Tank pairing behavior:

- Preserved version-1 payload:

  ```json
  {"v": 1, "tank_id": "firestore-document-id"}
  ```

- Supports QR scanning and manual entry.
- Produces typed errors for empty, malformed, unsupported, missing, or invalid
  payloads/IDs.
- Normalizes IDs against Firestore document-ID constraints.
- Makes duplicate joins and stale unlink operations safe.
- Rebinds the active tank immediately after pairing.
- Temporarily suspends the production camera for the QR scanner and restores
  it afterward using a nesting guard.
- Treats v1 as a bearer identifier; rules deny listing and restrict changes to
  adding/removing exactly the caller.

### Phase 3: Firestore repository and controller integration

`ProductionOceanEyesRepository` provides typed streams for tanks, reading
bundles, readings, history, analytics, fish inventory, alerts, current user,
linked tank IDs, live state, and per-viewer live requests.

It provides commands for:

- Tank create, join, unlink, owner-authorized delete, and rename.
- Threshold, water-line calibration, and recalibration updates.
- Reading writes and alert evaluation.
- Alert resolve/snooze.
- Fish add/count/detected-count/removal.
- FCM token save/removal.
- Viewer live request create/clear.
- Monitor live activation and heartbeat.

Repository guarantees:

- Injected Firebase instances and UID provider.
- Tank ID normalization through the pairing codec.
- Transactional tank/user membership updates.
- Duplicate-safe join/unlink behavior matching exact security rules.
- Deterministic ordering.
- Maximum ten FCM tokens per user.
- One mapped reading snapshot for dashboard/history/analytics.
- Tank deletion delegated to the secured callable.

Production streams update the existing controller fields only when production
is enabled. Fixture/direct construction establishes no remote streams.

### Phase 4: camera and ML pipeline

Camera work includes:

- Native Flutter camera adapter.
- Web adapter for permission, enumeration, capture, switching, and zoom.
- Conditional exports that prevent native camera/ONNX imports on web.
- Rear-first ordering without dropping front/external cameras.
- Atomic operation queue for initialize, switch, zoom, suspend, resume, and
  dispose.
- Capture blocking while a transition is queued/in progress.
- Safe lifecycle pause/resume.
- Full-frame and below-water-line ROI output with normalized coordinates.
- Inference timer/wake-lock cancellation on denied, failed, or unavailable
  camera state.

The existing account UI gained a narrow functional calibration control:

- A 0–100% water-line slider previews the crop.
- Commit persists normalized `calibration.water_line_y`.
- Remote `recalibrate_requested` remains supported.

Inference flow:

1. Capture a full frame.
2. Crop detector/classifier input below the water line.
3. Run RF-DETR detection.
4. Keep candidates above the detection threshold.
5. Classify up to 64 crops as a dynamic batch.
6. Run water-clarity inference on the full frame.
7. Convert boxes back into full-frame normalized coordinates.
8. Produce fish count/confidence, species counts, raw FNU, compatibility
   clarity score, detections, and classified centers.
9. Persist readings and detected fish counts.

Inference is single-flight; timer ticks are skipped while work is active.

#### Private ONNX model contract

Required untracked files:

```text
assets/models/fish_detector.onnx
assets/models/species_classifier.onnx
assets/models/water_clarity.onnx
```

They total roughly 285 MB and must come from approved private storage.

`fish_detector.onnx`:

- RF-DETR-Medium.
- Input `input`: `[1,3,576,576]`, float32 NCHW.
- Resize 576×576, RGB `/255`, then ImageNet normalization.
- Outputs `dets` `[1,300,4]` and `labels` `[1,300,2]`.
- Retains queries when `sigmoid(max(logits))` meets the threshold.
- Does not apply NMS, matching the deployed pipeline.

`species_classifier.onnx`:

- MobileNetV4.
- Input `input`: `[N,3,224,224]`, dynamic-batch float32 NCHW.
- Resize short side to 256, center-crop 224, apply ImageNet normalization.
- Output `output`: `[N,24]` logits.
- Softmax argmax must meet the classification threshold.
- Classification work is capped at 64 crops; total detection count remains
  based on all passing detector queries.

Exact class order:

```text
angelfish, betta, black_skirt_tetra, cardinal_tetra, cherry_barb,
clown_loach, corydoras, discus, dwarf_gourami, german_blue_ram,
goldfish, guppy, harlequin_rasbora, molly, neon_tetra, oscar,
otocinclus, platy, plecostomus, rummy_nose_tetra,
siamese_algae_eater, swordtail, tiger_barb, zebra_danio
```

`water_clarity.onnx`:

- YOLO turbidity classifier.
- Input `images`: `[1,3,224,224]`, float32 NCHW.
- Full-frame resize to 224×224 and RGB `/255`; no ImageNet normalization.
- Output `output0`: `[1,11]` probabilities.
- Raw calculation:

  ```text
  FNU = -60.9 + sum(coefficient[i] * probability[i])
  coefficients = [61.34, 61.57, 62.48, 65.53, 67.76, 73.91,
                  77.63, 85.64, 94.0, 102.85, 114.32]
  ```

- Approximately `0.44..53.42 FNU` maps inversely to clarity `10..1`.

Native builds without models report inference unavailable/failed without
breaking fixtures. Web inference is intentionally unavailable because the
integrated ONNX Runtime package uses native bindings.

### Phase 5: alerts, FCM, and Cloud Functions

The FCM client now requests permission, obtains and persists tokens, retries
refresh persistence, handles foreground/background/initial/opened messages,
maps payloads to a narrow `NotificationRoute`, opens the existing alert-detail
flow, and detaches tokens before account switching where possible.

User token arrays are capped at ten by repository behavior and rules. Legacy
single-token values remain readable during rollout.

Cloud Functions export:

| Function | Trigger | Purpose |
| --- | --- | --- |
| `evaluateAlertConditions` | App-Check callable | Authenticated owner/monitor manual evaluation. |
| `evaluateReadingAlertConditions` | Retry-enabled reading-create trigger | Durable evaluation for committed readings. |
| `dispatchAlertNotification` | Retry-enabled outbox-create trigger | FCM delivery independent from alert cooldown. |
| `getLiveKitToken` | App-Check callable | Role-scoped short-lived token. |
| `deleteTank` | App-Check callable | Owner tombstone, teardown, and paged cascade. |

Alert policy supports raw FNU and legacy clarity thresholds, seed exclusion,
fish-count drops, sustained missing fish, transactional creation/deduplication,
cooldown even after resolution, and monitor/owner manual authorization.

Alert delivery flow:

1. A transaction re-reads the active tank and membership.
2. It creates alert and server-only outbox records atomically.
3. The outbox trigger re-reads current outbox/tank state.
4. It records attempts using existence-required updates.
5. Tokens are sent in chunks of at most 500.
6. Invalid/unregistered tokens are removed.
7. Other failures are thrown so Firebase retries.
8. Deletion can remove/cancel outbox state without trigger recreation.

FCM delivery is at least once. A process crash after provider acceptance but
before `sent` is recorded can produce a duplicate; there is no exactly-once
transaction spanning Firestore and FCM.

### Phase 6: LiveKit streaming

Roles:

- Viewer: subscribe-only.
- Monitor/owner: camera publish plus subscribe, with data publish disabled.

The token Function requires Auth/App Check, revalidates active membership,
uses stable per-tank/user/role identity, creates a five-minute token, grants
only the requested room/role, restricts publishing to camera, and stores the
identity for revocation.

Each viewer owns `live_state/{tankId}/requests/{uid}`. Requests heartbeat every
20 seconds, expire after 60 seconds, and are checked every 5 seconds. Connect
failure, stop, exit, and disposal attempt cleanup. Existing requests are cached
until the monitor role arrives, preventing a startup race.

Camera/LiveKit handoff is serialized. Camera/ML capture suspends before monitor
publishing; production defaults wait 500 ms after camera release and 300 ms
after LiveKit disconnect. Tests inject zero delay. Failed startup disconnects
the room and restores the camera. Monitor live state pings every 20 seconds.

Tank deletion:

- Sets `deleting_at` transactionally.
- Makes the tank inactive under rules.
- Revokes stored LiveKit identities before deleting the room.
- Uses next-second revocation timestamps for already minted tokens.
- Deletes the room early and before final parent deletion.
- Deletes dependencies in bounded, awaited pages.
- Removes readings, fish, alerts, live requests/state, outbox, identities, and
  then the parent tank.
- Remains retryable after partial backend failure.

### Phase 7: validation and cleanup

Validation covered formatting, static analysis, Flutter tests, Functions
build/tests, Firestore emulator rules, Android/web builds, protected-file
hygiene, and a final security/lifecycle audit.

The audit identified and fixed:

- Production plugins leaking into fixtures/direct construction.
- Demo-only water/analytics getters in production.
- Old-UID listeners after Google account collision.
- Seed readings making new tanks appear healthy.
- Remote fish snapshots resetting local visibility.
- Duplicate billed reading listeners.
- Insecure self-join mutations and missing self-leave rules.
- Cross-tank reading rewrites.
- Viewer alert evaluation and alert-spam loops.
- Non-durable client-only reading evaluation.
- Notification loss caused by committing dedupe before FCM.
- FCM multicast/token-array limit handling.
- Unawaited token refresh persistence.
- Excessive LiveKit publish grants and long-lived replayable tokens.
- Stale viewer requests causing indefinite publishing.
- Viewer/monitor start-stop/dispose races.
- Overlapping camera transitions and missing front-camera switching.
- Missing camera/LiveKit settle time and wake lock.
- QR scanner/camera contention.
- Fixture analytics after production retry and demo state after startup failure.
- No-op water-line calibration.
- Android release debug signing.
- Rules-incompatible client tank deletion and unawaited BulkWriter work.
- In-flight notification triggers recreating deleted outbox state.

## Explicit Firestore schema mapping

The deployed schema and current presentation models do not match one-to-one.
All translation is centralized in `FirestoreSchemaMapper`; widgets never
deserialize Firestore directly.

### `tanks/{tankId}` to `ProductionTank`

| Firestore field | Current field/behavior |
| --- | --- |
| document ID | `ProductionTank.id` and canonical tank identifier |
| `name` | Display name with safe fallback |
| `owner_id` | `ownerId` |
| `monitor_uids` | `monitorIds` |
| `viewers` | `viewerIds` |
| `created_at` | Nullable creation time |
| `thresholds.turbidity_fnu_max` | `thresholds.turbidityFnuMax` |
| `thresholds.clarity_min` | Legacy `thresholds.clarityScoreMin` |
| `thresholds.fish_change_pct` | `visibleFishChangePercent` |
| `calibration.water_line_y` | Nullable normalized `waterLineY`, clamped 0–1 |
| `recalibrate_requested` | Remote monitor recalibration flag |
| `deleting_at` | Server tombstone; tank becomes inactive |

Role precedence is owner, monitor, viewer, then none. The owner is treated as
a monitor for reading writes and media publishing.

### `users/{uid}` to `ProductionUser`

| Firestore field | Current field/behavior |
| --- | --- |
| document ID | `ProductionUser.id` |
| `tanks` | Sorted/de-duplicated linked tank IDs |
| `fcm_tokens` | Current bounded token array |
| `fcm_token` | Legacy compatibility token read |
| `created_at` | Nullable timestamp |
| `display_name`, `email`, `photo_url` | Optional account metadata |

FCM tokens are normalized, de-duplicated, capped at ten, and detached during
account switching to avoid routing one device's notifications to the wrong
Firebase identity.

### `tank_fish/{fishId}` to `FishEntry`

| Firestore field | `FishEntry` behavior |
| --- | --- |
| document ID | `id` |
| `species_id` | Normalized through `ClassifiableSpeciesCatalog.resolveId` |
| catalog metadata | `name`, `scientificName`, asset, compatibility, care level |
| legacy `name` | Fallback when catalog resolution is unavailable |
| `count` | Integer clamped to 1–99 |
| `detected` | Integer clamped to 0–count |
| `visible` | Remote value is not presentation truth; local preference survives |

All 24 classifier IDs and known legacy aliases normalize to canonical IDs.
Unknown values use safe catalog/asset fallbacks. Remote writes retain legacy
`name` and `emoji` fields for compatibility.

### `readings/{readingId}` to live data, `HistoryReading`, and analytics

Clarity and turbidity are intentionally separate units:

- `clarity` is the deployed 1–10 clarity score.
- `clarity_score` is the explicit new name for the same 1–10 scale.
- `turbidity_fnu` is raw model output in FNU.

New writes store both forms:

| Firestore field | Mapping |
| --- | --- |
| document ID | `ProductionReading.id` |
| `tank_id` | `tankId` |
| `timestamp` | Nullable time; pending server timestamps stay nullable |
| `clarity_score` | Preferred 1–10 score |
| legacy `clarity` | Fallback 1–10 score |
| `turbidity_fnu` | Raw FNU; never silently treated as clarity |
| `fish_count` | Non-negative fish count |
| `fish_count_confidence` | Normalized confidence |
| `species_detected` | Canonical species-ID-to-count map |
| `frame_url` | Compatibility field, normally empty |
| `ph`, `temperature_celsius`, `ammonia_ppm`, `nitrite_ppm` | Optional chemistry |
| normalized detections/frame dimensions | Heatmap/overlay inputs |

Derived models:

- `HistoryReading.clarity` receives the 1–10 clarity score.
- Dashboard `WaterMetric('Turbidity')` receives raw `turbidity_fnu`.
- Analytics clarity percentage receives `clarityScore * 10`.
- Fish-count analytics receives timestamped `fish_count`.
- Species analytics is keyed by canonical classifier ID, not display name.
- Heatmap centers are normalized to the full frame.
- Analytics points sort oldest-first regardless of Firestore document order.

A reading enters history/analytics only when it has a resolved timestamp and a
positive clarity score. Seed and pending records can initialize live state but
do not enter charts.

### `alerts/{alertId}` to `AlertItem`

| Firestore field | Current behavior |
| --- | --- |
| document ID | Alert ID |
| `tank_id` | Source tank |
| `type` | Derives current title and semantics |
| `message` / `tip` | Current message and action plan |
| `severity` | `AlertSeverity` with safe fallback |
| `timestamp` | Retained timestamp and formatted UI label |
| context/before/after fields | Current before/after display values |
| `resolved` | Resolved state |
| `snoozed_until` | Optional snooze time |

Time-label mapping uses an injected clock. Unknown types, missing fields, and
unknown severities degrade safely.

### `live_state/{tankId}` and requests

Live state maps `is_live`, `started_at`, `last_ping_at`, clarity score, raw FNU,
fish count, publisher UID, and compatibility stream URL.

Per-viewer requests are stored at:

```text
live_state/{tankId}/requests/{uid}
```

They contain only `requester_uid` and server `requested_at`. This replaces the
legacy lossy global `requested=true` flag and supports concurrent viewers.

### Function-only collections

The Admin SDK exclusively owns these collections; rules deny all client access:

- `alert_dedupe`: transactional cooldown markers.
- `notification_outbox`: durable FCM work and delivery state.
- `livekit_identities`: identities used for token revocation.

## Firestore authorization model

### Users

- A user accesses only its own user document.
- Token changes must keep `fcm_tokens` a list of at most ten.

### Tanks

- An authenticated user can `get` a specific ID for v1 QR pairing.
- Listing tanks is denied.
- Creation makes the caller owner and sole initial monitor, with no viewers.
- Self-join adds exactly the caller and changes no other viewer.
- Self-leave removes exactly the caller and changes no other viewer.
- Monitors modify only calibration/recalibration fields.
- Owners modify documented tank settings/member fields without changing owner.
- Client hard deletion is denied; the callable owns cascade deletion.
- Tombstoned tanks are inactive for membership and writes.

### Readings

- Members read.
- Owners/monitors create.
- Owner updates must keep `tank_id` unchanged.
- Only owners delete individual readings.

### Fish inventory

- Members read and perform bounded inventory mutations.
- Updates keep `tank_id` unchanged and affect only allowed inventory fields.

### Alerts

- Members read and resolve.
- Monitors snooze within a bounded time window.
- Clients cannot create or delete alerts.

### Live state

- Members read.
- Owners/monitors write only documented live-state fields.
- Viewers create/update/delete only their own request document.
- Request writes require server time and the exact field set.

## Remote settings and production behavior

| Current setting | Production behavior |
| --- | --- |
| Tank name | Owner writes `tanks.name` |
| Turbidity threshold | `thresholds.turbidity_fnu_max` |
| Compatibility clarity threshold | `thresholds.clarity_min` |
| Visible fish change threshold | `thresholds.fish_change_pct` |
| Water line | `calibration.water_line_y` |
| Recalibration request | `recalibrate_requested` |
| Polling interval | Local preference controlling inference timer |
| Detection/species confidence | Local inference preferences |
| AI/detection display toggles | Existing local presentation preferences |

Explicit conversion domain:

```text
model FNU range:      0.44 .. 53.42
clarity score range: 10.0  .. 1.0 (inverse)
```

Missing maps, pending timestamps, and integer/double numeric values are
accepted by the mapper.

## Wake lock and application lifecycle

The controller requests a wake lock only while the production inference timer
is active or the device is publishing a monitor session. Changes are coalesced
and serialized. The lock is released after camera failure, timer cancellation,
lifecycle pause, tank unbind, live stop, or controller disposal. Gateway
disposal waits for the queued disable operation.

Lifecycle pause/resume also suspends/resumes the camera through the serialized
operation queue and prevents capture during queued transitions.

## Platform configuration

### Android

- Application ID: `com.oceaneyes.oceaneyes`.
- Minimum SDK: 23.
- Java/Kotlin target: 17.
- Google Services is applied only when the ignored
  `android/app/google-services.json` exists.
- `.onnx` assets are not compressed.
- Camera, internet, notification, and wake-lock permissions are declared.
- Release builds never use the debug key.
- If ignored `android/key.properties` exists, release signing uses it;
  otherwise release output remains unsigned.

Example private `android/key.properties`:

```properties
storeFile=C:\\secure\\oceaneyes-release.jks
storePassword=replace-locally
keyAlias=oceaneyes
keyPassword=replace-locally
```

### iOS

- Bundle ID: `com.oceaneyes.oceaneyes`.
- Camera usage description and remote-notification background mode are present.
- Production still requires the private Google service plist, reversed Google
  OAuth URL scheme, Push Notifications/Background Modes capabilities, APNs key,
  and valid profiles.

### Web

- Firebase options must be supplied via Dart defines.
- Google linking requires the web OAuth client ID.
- App Check requires a reCAPTCHA v3 site key when enabled.
- Camera, App Check, and push testing require HTTPS/secure origin.
- The tracked FCM service-worker example must be copied to the ignored live
  filename and configured locally.
- Camera capture works; ONNX inference remains unavailable pending a separately
  reviewed WASM/WebGPU adapter.

## Required private setup

### 1. Firebase applications

Create Android, iOS, and web apps in the target Firebase project. Enable
Anonymous and Google Authentication, Firestore, Cloud Functions, Cloud
Messaging, and the intended App Check providers.

Register Android SHA-1/SHA-256 fingerprints and configure the iOS OAuth URL
scheme. Generate native configuration if desired:

```powershell
dart pub global activate flutterfire_cli
flutterfire configure
```

These generated files are ignored and must remain private:

```text
lib/firebase_options.dart
android/app/google-services.json
ios/Runner/GoogleService-Info.plist
```

The app does not import generated `firebase_options.dart`; native builds may
initialize through service files, while every platform can use explicit Dart
defines.

### 2. Dart-defined configuration

Copy `config/production.example.json` to a secure path outside the repository
and set real values there.

| Define | Purpose/default |
| --- | --- |
| `OCEANEYES_APP_CHECK` | Enables App Check; defaults to `true`. |
| `OCEANEYES_APP_CHECK_DEBUG` | Selects native debug provider; defaults false. |
| `OCEANEYES_RECAPTCHA_V3_SITE_KEY` | Required for web App Check. |
| `OCEANEYES_FUNCTIONS_REGION` | Defaults to `us-central1`. |
| `OCEANEYES_FIREBASE_EMULATORS` | Enables local Auth/Firestore/Functions. |
| `OCEANEYES_FIRESTORE_EMULATOR_HOST` | Defaults to `localhost`. |
| `OCEANEYES_FIRESTORE_EMULATOR_PORT` | Defaults to `8080`. |
| `OCEANEYES_AUTH_EMULATOR_HOST` | Defaults to `localhost`. |
| `OCEANEYES_AUTH_EMULATOR_PORT` | Defaults to `9099`. |
| `OCEANEYES_FUNCTIONS_EMULATOR_HOST` | Defaults to `localhost`. |
| `OCEANEYES_FUNCTIONS_EMULATOR_PORT` | Defaults to `5001`. |
| `OCEANEYES_FIREBASE_API_KEY` | Firebase platform/web API key. |
| `OCEANEYES_FIREBASE_PROJECT_ID` | Firebase project ID. |
| `OCEANEYES_FIREBASE_MESSAGING_SENDER_ID` | FCM sender ID. |
| `OCEANEYES_FIREBASE_ANDROID_APP_ID` | Android Firebase app ID. |
| `OCEANEYES_FIREBASE_IOS_APP_ID` | iOS Firebase app ID. |
| `OCEANEYES_FIREBASE_WEB_APP_ID` | Web Firebase app ID. |
| `OCEANEYES_FIREBASE_AUTH_DOMAIN` | Web auth domain. |
| `OCEANEYES_FIREBASE_STORAGE_BUCKET` | Storage metadata/compatibility value. |
| `OCEANEYES_FIREBASE_MEASUREMENT_ID` | Optional web measurement ID. |
| `OCEANEYES_FIREBASE_IOS_BUNDLE_ID` | Defaults to `com.oceaneyes.oceaneyes`. |
| `OCEANEYES_FIREBASE_IOS_CLIENT_ID` | iOS Google OAuth client ID. |
| `OCEANEYES_FIREBASE_ANDROID_CLIENT_ID` | Android OAuth metadata. |
| `OCEANEYES_GOOGLE_WEB_CLIENT_ID` | Web client ID; Android `serverClientId`. |
| `OCEANEYES_FIREBASE_WEB_PUSH_VAPID_KEY` | Public web-push VAPID key. |

Customer release builds:

```powershell
flutter build web --release --dart-define-from-file=C:\secure\oceaneyes-production.json
flutter build appbundle --release --dart-define-from-file=C:\secure\oceaneyes-production.json
flutter build ipa --release --dart-define-from-file=C:\secure\oceaneyes-production.json
```

Internal emulator-only private define example:

```json
{
  "OCEANEYES_FIREBASE_EMULATORS": true,
  "OCEANEYES_FIRESTORE_EMULATOR_HOST": "localhost",
  "OCEANEYES_FIRESTORE_EMULATOR_PORT": 8080,
  "OCEANEYES_AUTH_EMULATOR_HOST": "localhost",
  "OCEANEYES_AUTH_EMULATOR_PORT": 9099,
  "OCEANEYES_FUNCTIONS_EMULATOR_HOST": "localhost",
  "OCEANEYES_FUNCTIONS_EMULATOR_PORT": 5001
}
```

Use `10.0.2.2` instead of `localhost` from an Android emulator.

### 3. App Check

Register Android with Play Integrity, Apple with App Attest plus DeviceCheck
fallback, and web with reCAPTCHA v3.

For local native debugging only:

```text
OCEANEYES_APP_CHECK_DEBUG=true
```

Register the emitted token in Firebase Console and never commit/distribute it.
Emulator mode skips App Check activation. Enable enforcement only after every
configured platform build has been verified.

### 4. Firestore and Functions

Install and build:

```powershell
npm --prefix functions ci
npm --prefix functions run build
```

Run the authorization suite against an isolated demo-project emulator:

```powershell
firebase emulators:exec --only firestore --project demo-oceaneyes "npm --prefix functions run test:rules"
```

Deploy explicitly to the intended project:

```powershell
firebase deploy --only firestore:rules,firestore:indexes,functions --project YOUR_PROJECT_ID
```

The Functions runtime is Node 20. Tracked indexes cover tank-filtered,
timestamp-descending readings and alerts.

### 5. LiveKit

Create a project and store credentials through Firebase Functions secrets:

```powershell
firebase functions:secrets:set LIVEKIT_API_KEY --project YOUR_PROJECT_ID
firebase functions:secrets:set LIVEKIT_API_SECRET --project YOUR_PROJECT_ID
```

Configure the non-secret URL:

```text
LIVEKIT_URL=wss://your-project.livekit.cloud
```

Never place the API key/secret in Flutter assets, Dart defines, tracked `.env`
files, or client code.

### 6. FCM, APNs, and web push

Android users grant notification permission at runtime where required.

For iOS:

1. Enable Push Notifications in the Runner target.
2. Enable Background Modes > Remote notifications.
3. Upload an APNs authentication key to Firebase.
4. Confirm profiles include the push entitlement.
5. Never commit the APNs `.p8` key.

For web:

1. Configure a VAPID key in Firebase Messaging.
2. Supply its public value through deployment configuration.
3. Copy `web/firebase-messaging-sw.example.js` to the ignored
   `web/firebase-messaging-sw.js`.
4. Replace placeholders locally.
5. Test over HTTPS.

### 7. ONNX assets

Obtain approved exports through private artifact storage, copy them to the
three exact `assets/models/` paths, and verify checksums against the release
manifest. Do not add model binaries to Git.

### 8. Android release signing

Create the approved keystore outside the repository and supply ignored
`android/key.properties`. Do not distribute a release until the artifact is
signed with the approved key.

## Validation record

### Automated credential-free checks

These commands passed against the final integration:

```powershell
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test
npm --prefix functions test
firebase emulators:exec --only firestore --project demo-oceaneyes "npm --prefix functions run test:rules"
```

| Check | Result |
| --- | --- |
| Dart formatting | 72 files checked; no changes required |
| Flutter static analysis | No issues found |
| Flutter unit/widget/golden suite | 108/108 tests passed |
| Functions TypeScript/policy suite | Build passed; 15/15 tests passed |
| Firestore authorization suite | Emulator 1.22.0; 8/8 tests passed |
| Git diff hygiene | Passed; expected Windows line-ending warnings only |
| Protected-file scan | No credentials, signing keys, or models tracked |

Customer release artifact validation requires the private production
configuration and the release commands documented above.

Production tests cover:

- Mapper coercion, aliases, clamping, ordering, timestamps, FNU/clarity
  separation, and catalog fallback.
- Anonymous auth, Google link/cancel/collision, token detach, and tank rejoin.
- QR encode/decode/manual validation and malformed payloads.
- Production-disabled/fixture controllers making zero production calls.
- Reading/fish/alert/live binding, replacement, and disposal.
- Auth UID switching and rejection of late old-UID events.
- Local fish visibility across remote updates.
- Camera ordering, operation serialization, lifecycle, crop, and web compile.
- Detector/classifier/clarity preprocessing and inference single-flight.
- Notification routing.
- Viewer connect failure cleanup, disposal during pending connection, stale
  requests, monitor publishing, and wake-lock ownership.
- Alert compatibility, cooldown, authorization, notification chunking, stable
  LiveKit identity, and token revocation timestamp.
- Rules for join/leave, get/no-list pairing, monitor writes, tombstones,
  server-only state, alerts, token caps, and live leases.

The existing fixture/widget/golden coverage is included in the 108 Flutter
tests.

### Visual matrix limitation

The existing 39-state `integration_test/visual_matrix_test.dart` suite needs a
supported device runner. The installed Flutter tool did not support running it
on a web device, and no Android/iOS device was attached. Its deterministic
widget/golden coverage did run.

### Dependency audit note

`npm ci` reported eight moderate transitive advisories below
`firebase-admin` 12 and no high/critical advisories. The complete npm-proposed
remediation requires a major move to `firebase-admin` 14 and Node 22. This
integration retains the validated Node 20 runtime; stage that major upgrade
separately.

## Remaining release validation

These checks need private accounts, credentials, signing material, or hardware:

- Verify anonymous auth, Google linking/cancellation/collision, and App Check
  against real Android, iOS, and web Firebase apps.
- Run all three models on representative physical Android/iOS devices.
- Measure inference latency, memory, thermals, battery, and sustained polling.
- Verify camera permissions, switching, lifecycle, calibration, QR handoff,
  and camera-to-LiveKit handoff on target devices.
- Verify foreground/background/terminated FCM delivery and APNs provisioning.
- Verify web camera, App Check, and push over HTTPS.
- Run a two-device LiveKit flow with reconnect, concurrent viewers, expiry,
  publisher/viewer crashes, and tank deletion/revocation.
- Run the 39-state integration visual matrix on a supported device.
- Build/sign Android with the approved keystore.
- Build/sign iOS on macOS with CocoaPods, capabilities, and valid profiles.

## Known limitations and intentional decisions

- Web ONNX inference is unavailable; web camera capture works.
- FCM is at least once and can very rarely duplicate at the provider/status
  crash boundary.
- Version-1 QR is a bearer tank ID without expiry/replay protection; rules
  still restrict it to exact self-join/self-leave and deny listing.
- `frame_url` remains a compatibility field. Firebase Storage was not added
  because this flow does not upload frames.
- SharedPreferences remains local presentation/settings persistence, not
  remote production truth.
- LiveKit tokens are short-lived; stored identity enables deletion-time
  revocation where the server supports it, with TTL as fallback.
- No exactly-once primitive spans Firestore and FCM.
- A release without `android/key.properties` is unsigned, never debug-signed.

## Repository hygiene

Tracked production files contain no:

- `google-services.json` or `GoogleService-Info.plist`.
- Generated `firebase_options.dart`.
- LiveKit key/secret or real `.env` file.
- APNs private key.
- Android keystore/passwords.
- App Check debug token.
- `.onnx`, `.ort`, or `.tflite` model binary.

Only placeholder examples and model interface documentation are tracked.

## Changed-file index

### Runtime and configuration

```text
.gitignore
README.md
config/production.example.json
firebase.json
pubspec.yaml
pubspec.lock
lib/main.dart
lib/app/oceaneyes_app.dart
lib/app/oceaneyes_bootstrap.dart
lib/app/production_config.dart
```

### Typed production boundaries

```text
lib/models/production_auth.dart
lib/models/production_data.dart
lib/models/production_repository.dart
lib/models/tank_pairing_codec.dart
```

### Firebase, Auth, Firestore, and FCM

```text
lib/integrations/firebase/firebase_auth_gateway.dart
lib/integrations/firebase/firebase_bootstrap.dart
lib/integrations/firebase/firebase_notification_service.dart
lib/integrations/firebase/firestore_oceaneyes_repository.dart
lib/integrations/firebase/firestore_schema_mapper.dart
```

### Camera and ML

```text
lib/integrations/camera/camera_capture_gateway.dart
lib/integrations/camera/camera_capture_gateway_native.dart
lib/integrations/camera/camera_capture_gateway_stub.dart
lib/integrations/camera/camera_capture_gateway_web.dart
lib/integrations/camera/camera_capture_models.dart
lib/integrations/camera/camera_operation_queue.dart
lib/integrations/camera/water_line_cropper.dart
lib/integrations/ml/fish_inference_models.dart
lib/integrations/ml/fish_inference_preprocessing.dart
lib/integrations/ml/inference_single_flight.dart
lib/integrations/ml/onnx_fish_inference.dart
lib/integrations/ml/onnx_fish_inference_native.dart
lib/integrations/ml/onnx_fish_inference_stub.dart
assets/models/README.md
```

### LiveKit and power

```text
lib/integrations/livekit/livekit_gateway.dart
lib/integrations/power/wake_lock_gateway.dart
```

### View-model and narrow UI wiring

```text
lib/view_models/oceaneyes_controller.dart
lib/ui/screens/account_screen.dart
lib/ui/widgets/aquarium_hero.dart
lib/ui/widgets/tank_pairing_sheet.dart
```

### Firebase backend

```text
firestore.rules
firestore.indexes.json
functions/.env.example
functions/.gitignore
functions/package.json
functions/package-lock.json
functions/tsconfig.json
functions/src/index.ts
functions/src/alert_dedupe.ts
functions/src/alert_policy.ts
functions/src/authorization.ts
functions/src/livekit_service.ts
functions/src/notification_batching.ts
```

### Platform integration

```text
android/.gitignore
android/app/build.gradle.kts
android/app/src/main/AndroidManifest.xml
android/settings.gradle.kts
android/gradle/wrapper/gradle-wrapper.jar
android/gradlew
android/gradlew.bat
ios/Podfile
ios/Runner/Info.plist
web/firebase-messaging-sw.example.js
```

### Production tests

```text
test/production/camera_capture_gateway_test.dart
test/production/camera_ml_web_compile_test.dart
test/production/firebase_auth_gateway_test.dart
test/production/firestore_schema_mapper_test.dart
test/production/inference_single_flight_test.dart
test/production/ml_inference_preprocessing_test.dart
test/production/notification_route_test.dart
test/production/tank_pairing_codec_test.dart
test/view_models/oceaneyes_production_controller_test.dart
functions/test/alert_dedupe.test.js
functions/test/alert_policy.test.js
functions/test/authorization.test.js
functions/test/firestore_rules.emulator.js
functions/test/livekit_service.test.js
functions/test/notification_batching.test.js
```

### Supporting documents

```text
docs/production_migration_plan.md
docs/production_setup.md
docs/production_validation.md
docs/production_integration_handoff.md
```

This file is self-contained and supersedes the need to consult the other three
production documents together. They remain as shorter topic-specific guides.

## Operational checklist

### Before staging

- [ ] Create platform Firebase apps and enable required products/providers.
- [ ] Configure App Check providers.
- [ ] Install private service files or prepare private Dart defines.
- [ ] Configure Google OAuth clients and iOS URL scheme.
- [ ] Store LiveKit secrets through Firebase Functions secrets.
- [ ] Configure `LIVEKIT_URL`.
- [ ] Install approved ONNX binaries and verify checksums.
- [ ] Configure APNs and web VAPID.
- [ ] Run Flutter, Functions, and rules emulator tests.

### Before release

- [ ] Complete physical Android/iOS camera and model performance testing.
- [ ] Complete real App Check/Auth/Google collision testing.
- [ ] Complete FCM/APNs/web push testing in every lifecycle state.
- [ ] Complete two-device LiveKit crash/expiry/revocation testing.
- [ ] Run the 39-state visual matrix on a supported device.
- [ ] Sign Android with the approved private key.
- [ ] Build/sign iOS on macOS with production capabilities/profiles.
- [ ] Confirm no credentials, keys, generated config, or models are tracked.
- [ ] Schedule the separately staged Firebase Admin/Node major upgrade.

## Final handoff state

All seven requested repository-side phases are implemented and pushed. The
remaining items are intentionally external validation and release configuration
tasks requiring project credentials, Firebase/LiveKit accounts, signing
material, or physical devices; none were fabricated or embedded in the
repository.
