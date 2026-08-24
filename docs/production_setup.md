# Production setup

OceanEyes ships a Firebase-backed production stack. Debug/profile runs also
have a credential-free local preview for UI development; release builds never
use that preview. Tests use injected fakes.

## Firebase client configuration

The repository contains the generated client options in
`lib/firebase_options.dart`. Regenerate them after changing the Firebase
project or platform registrations:

```powershell
dart pub global activate flutterfire_cli
flutterfire configure --project ocean-eyes-webapp
```

The configured application IDs are:

- Android: `com.oceaneyes.oceaneyes`
- iOS: `com.oceaneyes.oceaneyes`
- Web: `ocean-eyes-webapp`

Firebase client keys and app IDs are application configuration, not server
secrets. Do not put LiveKit credentials, APNs keys, signing keys, or private
App Check debug tokens in the repository.

## Runtime values

Copy `config/production.example.json` outside the repository and replace its
placeholders. It contains only values that are not part of the generated
Firebase options:

- Google web OAuth client ID
- iOS Google OAuth client ID (`OCEANEYES_GOOGLE_IOS_CLIENT_ID`)
- Web Push VAPID key
- Web reCAPTCHA v3 site key
- Privacy Policy and Terms URLs

Run or build with the private file:

```powershell
flutter run -d edge --dart-define-from-file=C:\secure\oceaneyes-production.json
flutter build web --release --dart-define-from-file=C:\secure\oceaneyes-production.json
flutter build appbundle --release --dart-define-from-file=C:\secure\oceaneyes-production.json
flutter build ipa --release --dart-define-from-file=C:\secure\oceaneyes-production.json
```

For local UI development, run the app normally:

```powershell
flutter run
```

Debug and profile runs default to a credential-free local preview. To run the
Firebase-backed staging stack from debug mode, the define file must include
`"OCEANEYES_PRODUCTION": true` (or pass
`--dart-define=OCEANEYES_PRODUCTION=true`).

The shared VS Code Run/Debug configuration launches `lib/main.dart` in debug
mode with `C:\secure\oceaneyes-staging.json`. Keep that private staging file at
the configured path; it remains outside version control. The local preview
configuration is available alongside it in the Run and Debug menu.

Production mode validates these values before initializing Firebase. The
`OCEANEYES_PRODUCTION` flag selects production for debug/profile runs, while
release builds always use production regardless of that flag.

## App Check and Google sign-in

App Check always uses Play Integrity on Android, App Attest with DeviceCheck
fallback on iOS, and reCAPTCHA v3 on web. Register each production app in the
Firebase console before testing authentication or protected Firestore data.

Google sign-in uses the web OAuth client ID as the Android server client ID,
the iOS client ID on Apple platforms, and the web client ID in the browser.
Register the release Android certificate fingerprints and the iOS URL scheme
with Firebase/Google OAuth before physical-device testing.

## Cloud Functions and LiveKit

The Functions source is in `functions/` and runs on Node.js 20. Install and
test it with:

```powershell
npm --prefix functions ci
npm --prefix functions test
```

Store `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` in Firebase/Google Secret
Manager. The Flutter client receives short-lived tokens from callable
Functions; never put LiveKit credentials in Dart defines or assets.

Deploy the backend explicitly to the intended Firebase project:

```powershell
firebase use ocean-eyes-webapp
firebase deploy --only firestore:rules,firestore:indexes,functions
```

## Android release signing

Create the untracked `android/key.properties` file:

```properties
storeFile=release-upload.jks
storePassword=replace-me
keyAlias=oceaneyes
keyPassword=replace-me
```

Place the approved keystore at the configured path. Release Gradle tasks fail
closed when this file or the keystore is missing. The three ONNX model binaries
must also be supplied under `assets/models/` before Android inference testing.

## Web notifications

Copy `web/firebase-messaging-sw.example.js` to
`web/firebase-messaging-sw.js` and fill it with the same web Firebase client
options used by `lib/firebase_options.dart`. Serve the web app over HTTPS when
testing camera, App Check, Google sign-in, or push notifications.

## Validation

Run the local checks before handing off a build:

```powershell
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test
npm --prefix functions test
```

Physical Android/iOS validation is still required for camera permissions,
ONNX memory/thermal behavior, App Check, FCM, and LiveKit reconnect behavior.
