# Release approval gate

Status: **blocked pending customer-owned release inputs and physical smoke
testing**.

## Backend evidence — 22 August 2026

- Firebase project: `ocean-eyes-webapp`
- Android app: `1:1072877532089:android:d7aac1fb54b47d8d2fbc68`
- Package: `com.oceaneyes.oceaneyes`
- Anonymous Auth and Google sign-in: deployed and enabled
- Firestore rules: compiled and released
- Firestore indexes: deployed successfully
- Functions: six Node.js 20 2nd-gen functions deployed successfully in
  `us-central1`
- LiveKit secret metadata: `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` each have
  an enabled version; the configured Functions URL is non-placeholder
- App Check debug tokens: none registered for the production Android app

The exact source used for the Functions deployment was the working tree at
`d31074c872bc93ee3da01dcb59802f9526e87f8b`; the Functions source had no local
changes relative to that revision.

## Automated evidence — 22 August 2026

- Dart format: passed after the final formatting pass
- `flutter analyze`: passed with no issues
- Flutter tests: 169 passed
- Functions build/unit suite: 15 passed
- Firestore rules emulator suite: 8 passed
- Release validator: correctly rejected the tracked example because it lacks
  real production values, signing material, and ONNX assets
- Android device inventory: `adb devices -l` returned no attached devices
- Customer artifact: no AAB was produced; the pre-existing ignored AAB was
  verified unsigned and is not a release candidate

## Required before approval

- Supply the approved release version/build number and real HTTPS Privacy Policy
  and Terms destinations.
- Supply the approved keystore through untracked `android/key.properties` and
  register its SHA-1/SHA-256 fingerprints with Firebase Auth/Google OAuth and
  Play Integrity App Check.
- Complete production Play Integrity registration/enforcement after the
  approved release certificate is registered.
- Supply the three approved ONNX model binaries and verify their checksums.
- Supply the private Android Dart-define file, including the production web
  OAuth client ID.
- Run `dart run tool/build_release.dart --target appbundle --config <private-file>`.
- Archive the resulting `build/app/outputs/bundle/release/app-release.aab`, the
  private config version identifier (never the config contents), this backend
  revision, and the signed two-device smoke-test results.
- Complete the full smoke matrix on two physical Android devices, including
  FCM terminated delivery, App Check, camera permission transitions, and
  LiveKit reconnect/cleanup.

## Latest workspace re-audit — 22 August 2026

- `android/key.properties` is still absent.
- `assets/models/` still contains only the model README; all three binaries are
  absent.
- No `OCEANEYES_*` release environment variables or private release JSON were
  found in the workspace.
- `adb devices -l` still reports no attached Android devices.
- Firebase Functions remain deployed and App Check still has no debug tokens;
  the Firebase CLI app-list command currently requires account re-authentication.
