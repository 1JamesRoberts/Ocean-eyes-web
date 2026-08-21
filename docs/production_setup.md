# Production setup

OceanEyes has two supported workflows. Dev mode uses the deterministic local
preview and does not access Firebase, camera, messaging, LiveKit, or ONNX
Runtime. Customer mode is the release build produced with
`OCEANEYES_PRODUCTION=true` and a private Dart-define file.

Firebase Auth, Firestore, and Functions emulators are internal engineering
infrastructure only. Never put real values in the tracked example files.

## 1. Firebase applications

Create Android, iOS, and web apps in the intended Firebase project. The current
native identifiers are:

- Android application ID: `com.oceaneyes.oceaneyes`
- iOS bundle ID: `com.oceaneyes.oceaneyes`

Enable Anonymous and Google providers under Firebase Authentication. Add the
Android SHA-1/SHA-256 signing fingerprints and the iOS URL scheme required by
the generated Google configuration.

For native builds, install FlutterFire CLI and generate the untracked files:

```powershell
dart pub global activate flutterfire_cli
flutterfire configure
```

The repository ignores:

- `lib/firebase_options.dart`
- `android/app/google-services.json`
- `ios/Runner/GoogleService-Info.plist`

The app does not import `firebase_options.dart`; it can initialize from the
native files or from Dart defines. This keeps credentials out of tracked source;
fixture-only tests remain independent of Firebase. Copy
`config/production.example.json` outside the repository and replace the
placeholders. Customer artifacts are built with:

```powershell
flutter build web --release --dart-define-from-file=C:\secure\oceaneyes-production.json
flutter build appbundle --release --dart-define-from-file=C:\secure\oceaneyes-production.json
flutter build ipa --release --dart-define-from-file=C:\secure\oceaneyes-production.json
```

The production Firebase/Google stack is supported on Android, iOS, and web.
The Windows desktop target is not a customer production target.

Google linking needs OAuth client configuration in addition to Firebase app
options. With native Google service files, keep the generated Android web
client entry and iOS URL scheme. For a Dart-define-only build, set
`OCEANEYES_GOOGLE_WEB_CLIENT_ID` to the **Web application** OAuth client ID
(Android uses it as `serverClientId`), set
`OCEANEYES_FIREBASE_IOS_CLIENT_ID` to the iOS OAuth client ID, and add that iOS
client's reversed-ID URL scheme to the Runner target. The Android OAuth client
ID is not a substitute for the web/server client ID.

Web requires the Dart-defined Firebase values. Copy
`web/firebase-messaging-sw.example.js` to the gitignored
`web/firebase-messaging-sw.js`, replace its placeholders, and serve over HTTPS
for camera, App Check, and push-notification testing.

## 2. Firebase App Check

Register the Android app for Play Integrity, the Apple app for App Attest with
DeviceCheck fallback, and the web app for reCAPTCHA v3. Set
`OCEANEYES_RECAPTCHA_V3_SITE_KEY` for web.

For local native debug builds only, set
`OCEANEYES_APP_CHECK_DEBUG=true`, copy the emitted debug token into the Firebase
console, and never distribute that token. Emulator runs can set App Check off
or use the emulator configuration below. Enable service enforcement only after
each configured build has been verified.

## 3. Firestore and Functions

Install Firebase CLI, select the intended project explicitly, then deploy the
tracked rules, indexes, and Functions:

```powershell
npm --prefix functions ci
npm --prefix functions run build
firebase deploy --only firestore:rules,firestore:indexes,functions --project YOUR_PROJECT_ID
```

Run the authorization suite against an isolated demo-project emulator before
deploying rule changes (a JDK is required):

```powershell
firebase emulators:exec --only firestore --project demo-oceaneyes "npm --prefix functions run test:rules"
```

The client reads the deployed legacy collections (`users`, `tanks`,
`readings`, `tank_fish`, `alerts`, and `live_state`) through explicit mappers.
New reading and threshold fields are additive, so older clients can continue to
read the compatibility fields during rollout. Review
`docs/production_migration_plan.md` for the exact mapping.

Functions additionally own `alert_dedupe`, `notification_outbox`, and
`livekit_identities`. Client rules deny every read/write to these collections.
A retry-enabled reading trigger evaluates alerts, and a separate outbox trigger
delivers FCM messages without coupling delivery retries to the alert cooldown.

To use local emulators, add these defines to a private configuration file:

```json
{
  "OCEANEYES_PRODUCTION": true,
  "OCEANEYES_FIREBASE_EMULATORS": true,
  "OCEANEYES_FIRESTORE_EMULATOR_HOST": "localhost",
  "OCEANEYES_FIRESTORE_EMULATOR_PORT": 8080,
  "OCEANEYES_AUTH_EMULATOR_HOST": "localhost",
  "OCEANEYES_AUTH_EMULATOR_PORT": 9099,
  "OCEANEYES_FUNCTIONS_EMULATOR_HOST": "localhost",
  "OCEANEYES_FUNCTIONS_EMULATOR_PORT": 5001
}
```

Start the emulators for internal engineering validation:

```powershell
firebase emulators:start --only auth,firestore,functions --project demo-oceaneyes
```

Use `10.0.2.2` instead of `localhost` from an Android emulator. This emulator
configuration is consumed only by internal validation and does not create a
third customer-facing app mode.

## 4. LiveKit

Create a LiveKit project. Store the API credentials in Google Secret Manager
through Firebase CLI; do not place them in Flutter assets, Dart defines, or a
tracked `.env` file:

```powershell
firebase functions:secrets:set LIVEKIT_API_KEY --project YOUR_PROJECT_ID
firebase functions:secrets:set LIVEKIT_API_SECRET --project YOUR_PROJECT_ID
```

Set the non-secret WebSocket URL as a Functions parameter/environment value:

```text
LIVEKIT_URL=wss://your-project.livekit.cloud
```

The callable Function mints short-lived room tokens after checking Firebase
Auth, App Check, tank membership, and the requested monitor/viewer role. Tokens
use stable per-tank/user/role identities and a five-minute initial TTL. Stored
identities let the owner-only deletion Function revoke LiveKit Cloud tokens
before it removes the room; self-hosted deployments still rely on the short
TTL where server-side token revocation is unavailable.

## 5. FCM and platform capabilities

Android declares runtime notification, camera, internet, and wake-lock
permissions. Users still must grant camera and notification access at runtime.

For iOS, enable **Push Notifications** and **Background Modes > Remote
notifications** in the Runner target, upload an APNs authentication key to
Firebase, and ensure the provisioning profiles contain the push entitlement.
Do not commit the APNs `.p8` key. `Info.plist` already contains the camera usage
description and the remote-notification background mode.

Android release builds are never signed with the debug key. Create an approved
release keystore outside the repository, then add an untracked
`android/key.properties` with `storeFile`, `storePassword`, `keyAlias`, and
`keyPassword`. Use an absolute `storeFile` path or a path relative to
`android/app`. Without that file, release output is unsigned; debug builds keep
using the normal debug signing setup. Never commit the keystore or properties.

For web, configure a VAPID key in Firebase Messaging and pass it through the
deployment environment when requesting a browser token. Background delivery
uses the untracked service worker described above.

## 6. ONNX models

Place these three untracked files in `assets/models/`:

```text
fish_detector.onnx
species_classifier.onnx
water_clarity.onnx
```

They total roughly 285 MB and must be distributed through approved artifact
storage, not Git. See `assets/models/README.md` for model I/O, preprocessing,
class ordering, and checksum guidance. A production build without the files can
compile, but the ML gateway reports unavailable and the build is not
release-ready. Fixture-only tests do not require the private model binaries.

## 7. Validation

Credential-free checks:

```powershell
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test
npm --prefix functions test
firebase emulators:exec --only firestore --project demo-oceaneyes "npm --prefix functions run test:rules"
```

Use the private production configuration and the release commands above for
customer artifacts; an unconfigured release build is not a customer build.

Configured validation additionally needs physical Android/iOS devices for App
Check, Google linking, camera/ONNX memory and thermal behavior, background FCM,
and two-device LiveKit publishing/subscribing. Web camera and FCM testing must
use a secure origin. See `docs/production_validation.md` for the checked and
configuration-dependent validation matrix.
