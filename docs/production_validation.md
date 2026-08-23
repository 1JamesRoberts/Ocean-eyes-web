# Production validation record

For the August 21, 2026 current-state follow-up—including the two-controller
synchronization proof and explicit recovery assertions—see
[`current_state_validation.md`](current_state_validation.md). This document
retains the historical August 20 integration record and its staging checklist.

Validation was performed on Windows on August 20, 2026. The source integration
was audited against `YoYo-XYZ/ocean-eyes` `dev-main` commit
`0aae6ec10011741da4e22d36f214eb6dd458b132`.

## Credential-free checks

These checks use injected gateways and direct fixture-controller test seams;
they do not make the shipped application runtime depend on a separate fixture
mode. Running the application itself requires Firebase configuration or the
documented Firebase emulators.

The following checks require no Firebase project, LiveKit account, or ONNX
model binaries. They passed against the final integration:

```powershell
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test
npm --prefix functions test
firebase emulators:exec --only firestore --project demo-oceaneyes "npm --prefix functions run test:rules"
```

| Check | Result |
| --- | --- |
| Dart formatting | 72 files checked, no changes required |
| Flutter analysis | No issues found |
| Flutter unit/widget/golden suite | 108 tests passed |
| Cloud Functions TypeScript/policy suite | Build passed; 15 tests passed |
| Firestore rules/indexes | Firestore Emulator 1.22.0; 8 authorization tests passed |
| Customer release artifacts | Require the private customer configuration and the guarded release commands in `docs/production_setup.md` |

Customer release artifact validation is intentionally separate from these
credential-free checks and must use the private production configuration plus
the release/CI guard. The guard rejects placeholders, emulator/debug settings,
and any configuration that could select fixture mode.

The Flutter suite includes the existing widget/golden coverage plus production
mapper, auth, pairing, camera/ML contract, notification-route, and controller
isolation tests, including camera serialization, wake-lock ownership, LiveKit
leases/handoffs, and production-startup isolation. The Functions suite covers
FNU/legacy clarity thresholds, server-triggered alert evaluation, cooldown
dedupe, multicast chunking, stable LiveKit identities/revocation timestamps,
seed readings, sustained missing-fish alerts, and fish-count drops. Emulator
tests exercise exact self-join/leave set changes, bearer get/no-list pairing,
monitor-only readings, tombstones, server-only state, alert permissions, FCM
token caps, and live-request leases.

The 39-state `integration_test/visual_matrix_test.dart` matrix still requires a
supported device runner. The local Flutter tool reported that web devices are
not supported for integration tests, and no Android/iOS device was attached;
the fixture/golden widget coverage did run as part of the 108-test suite.

`npm ci` reports eight moderate transitive advisories below
`firebase-admin` 12 and no high/critical advisories. npm's proposed complete
remediation is a major move to `firebase-admin` 14/Node 22; the integration
retains its validated Node 20 Firebase Functions runtime and records that
runtime/dependency upgrade for a separately staged migration.

## Configuration-dependent checks

These checks cannot be represented honestly without private external state and
must be completed in the target staging project before release:

- Verify fresh unauthenticated startup, Google sign-in persistence, sign-out,
  Google-only rule/callable rejection, and App Check using staging Firebase
  apps.
- Run camera plus all three approved ONNX models on physical Android and iOS
  devices; measure memory, latency, thermals, and sustained polling behavior.
- Verify foreground/background/terminated FCM delivery, APNs provisioning, and
  web push over HTTPS.
- Run a two-device LiveKit flow with one monitor publisher and one viewer,
  including reconnect, heartbeat expiry, and concurrent viewer requests.
- Build/sign the Android release with the approved private keystore.
- Build/sign iOS on macOS after installing CocoaPods and enabling the Push
  Notifications capability.

The web build deliberately keeps ONNX inference unsupported because the
integrated `onnxruntime` Flutter package uses native bindings. It reports that
capability as unavailable instead of importing native libraries into the web
bundle. Do not claim web inference support until a separately reviewed WebGPU
or WASM inference adapter is added.

## Repository hygiene

The final candidate scan confirmed that tracked integration files contain none
of the following:

- `google-services.json`, `GoogleService-Info.plist`, or generated
  `firebase_options.dart`
- real `.env` files, LiveKit credentials, APNs keys, signing keystores, or
  private App Check debug tokens
- `.onnx`, `.ort`, or `.tflite` model binaries

Only placeholder/example configuration and model interface documentation are
intended to be tracked.
