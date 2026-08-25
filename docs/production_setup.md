# Production setup

OceanEyes ships a Firebase-backed production stack. Debug, profile, and release
runs use the real integrations by default. Tests use injected fakes, and an
explicit local-preview flag remains available for isolated UI development.

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

The Firebase project's OAuth client IDs have non-secret defaults in the app
configuration. Use `config/production.example.json` only when a build must
override those defaults for another Firebase project. It can also provide:

- Google web OAuth client ID
- iOS Google OAuth client ID (`OCEANEYES_GOOGLE_IOS_CLIENT_ID`)

Run or build with the private file:

```powershell
flutter run -d edge --dart-define-from-file=C:\secure\oceaneyes-production.json
flutter build web --release --dart-define-from-file=C:\secure\oceaneyes-production.json
flutter build appbundle --release --dart-define-from-file=C:\secure\oceaneyes-production.json
flutter build ipa --release --dart-define-from-file=C:\secure\oceaneyes-production.json
```

For normal development with Firebase, the physical camera, ONNX inference,
FCM, LiveKit, and wake lock, run the app normally:

```powershell
flutter run
```

To explicitly run the credential-free mocked UI preview instead:

```powershell
flutter run --dart-define=OCEANEYES_LOCAL_PREVIEW=true
```

The first shared VS Code Run/Debug configuration uses real integrations with
no extra arguments. The explicit local-preview configuration is available
alongside it in the Run and Debug menu.

Real-service mode validates platform service values before initializing
Firebase. `OCEANEYES_LOCAL_PREVIEW=true` is honored in debug/profile builds;
release builds always use real integrations.

## App Check and Google sign-in

App Check uses Play Integrity on Android and App Attest with DeviceCheck
fallback on iOS. Web reCAPTCHA v3 App Check and web push are optional until
their keys are configured; the web app still starts without them.

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
closed when this file or the keystore is missing. ONNX model binaries are
optional in the current production build; without them, AI capture is disabled
while camera streaming and LiveKit remain available.

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
