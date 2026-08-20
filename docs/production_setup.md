# Production setup

OceanEyes ships with production integrations compiled in but disabled by
default. Deterministic fixtures and ordinary tests do not initialize Firebase,
camera, messaging, LiveKit, or ONNX Runtime.

Enable the production composition root with
`OCEANEYES_PRODUCTION=true`. Never put real values in the tracked example
files.

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
native files or from Dart defines. This keeps credential-free fixture builds
working. Copy `config/production.example.json` outside the repository, replace
the placeholders, and run:

```powershell
flutter run --dart-define-from-file=C:\secure\oceaneyes-production.json
```

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

Use `10.0.2.2` instead of `localhost` from an Android emulator.

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
class ordering, and checksum guidance. A build without the files remains valid;
the ML gateway reports unavailable and the deterministic fixture UI continues
to work.

## 7. Validation

Credential-free checks:

```powershell
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test
flutter build web --release
flutter build apk --debug
npm --prefix functions test
firebase emulators:exec --only firestore --project demo-oceaneyes "npm --prefix functions run test:rules"
```

Configured validation additionally needs physical Android/iOS devices for App
Check, Google linking, camera/ONNX memory and thermal behavior, background FCM,
and two-device LiveKit publishing/subscribing. Web camera and FCM testing must
use a secure origin. See `docs/production_validation.md` for the checked and
configuration-dependent validation matrix.
