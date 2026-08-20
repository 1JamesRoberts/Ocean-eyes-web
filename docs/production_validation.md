# Production validation record

Validation was performed on Windows on August 14, 2026. The source integration
was audited against `YoYo-XYZ/ocean-eyes` `dev-main` commit
`0aae6ec10011741da4e22d36f214eb6dd458b132`.

## Credential-free checks

The following checks require no Firebase project, LiveKit account, or ONNX
model binaries. They passed against the final integration:

```powershell
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test
flutter build web --release
flutter build apk --debug
npm --prefix functions test
```

| Check | Result |
| --- | --- |
| Dart formatting | 70 files checked, no changes required |
| Flutter analysis | No issues found |
| Flutter unit/widget/golden suite | 86 tests passed |
| Cloud Functions TypeScript/policy suite | Build passed; 4 tests passed |
| Firestore rules/indexes | Firestore Emulator 1.22.0 started cleanly with the tracked configuration |
| Android debug build | `app-debug.apk` produced successfully |
| Flutter web release build | Build and WebAssembly dry run passed |

The Android and web builds were run from an otherwise identical temporary
copy outside OneDrive because OneDrive held generated Gradle assets open during
cleanup in the workspace. The clean-copy Android build confirms that failure
was a sync-file lock rather than a source or Gradle configuration problem.

The Flutter suite includes the existing widget/golden coverage plus production
mapper, auth, pairing, camera/ML contract, notification-route, and controller
isolation tests. The Functions suite covers FNU/legacy clarity thresholds,
seed readings, sustained missing-fish alerts, and fish-count drops.

The 39-state `integration_test/visual_matrix_test.dart` matrix still requires a
supported device runner. The local Flutter tool reported that web devices are
not supported for integration tests, and no Android/iOS device was attached;
the fixture/golden widget coverage did run as part of the 86-test suite.

## Configuration-dependent checks

These checks cannot be represented honestly without private external state and
must be completed in the target staging project before release:

- Exercise owner, monitor, viewer, and unauthenticated authorization cases
  against the compiled rules in a Firebase Emulator Suite test harness.
- Verify anonymous auth, Google linking, App Check, and account-collision tank
  restoration using staging Firebase apps.
- Run camera plus all three approved ONNX models on physical Android and iOS
  devices; measure memory, latency, thermals, and sustained polling behavior.
- Verify foreground/background/terminated FCM delivery, APNs provisioning, and
  web push over HTTPS.
- Run a two-device LiveKit flow with one monitor publisher and one viewer,
  including reconnect, heartbeat expiry, and concurrent viewer requests.
- Build/sign iOS on macOS after installing CocoaPods and enabling the Push
  Notifications capability.

The web build deliberately keeps ONNX inference unsupported because the
integrated `onnxruntime` Flutter package uses native bindings. It reports that
capability as unavailable instead of importing native libraries into the web
bundle. Do not claim web inference support until a separately reviewed WebGPU
or WASM inference adapter is added.

## Repository hygiene

Before release, confirm that tracked files contain none of the following:

- `google-services.json`, `GoogleService-Info.plist`, or generated
  `firebase_options.dart`
- real `.env` files, LiveKit credentials, APNs keys, signing keystores, or
  private App Check debug tokens
- `.onnx`, `.ort`, or `.tflite` model binaries

Only placeholder/example configuration and model interface documentation are
intended to be tracked.
