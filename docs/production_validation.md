# Production validation

The application now has one runtime composition: Firebase Auth/Firestore,
camera, FCM, LiveKit, and wake-lock integrations are initialized by
`lib/app/oceaneyes_bootstrap.dart`. Tests inject fakes and deterministic data;
they do not select a second app mode.

## Local checks

```powershell
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test
npm --prefix functions test
```

These checks do not require Firebase credentials, camera hardware, or LiveKit
credentials because the gateways are injected in unit and controller tests.
ONNX inference is optional until the private model bundle is restored.

## Production checks

Run these against the intended Firebase project and physical devices before
distribution:

- Google sign-in, restored sessions, sign-out, and protected Firestore access.
- App Check on Android Play Integrity and iOS App Attest/DeviceCheck. Web
  reCAPTCHA and push validation are deferred until their optional keys exist.
- Camera permission transitions, lens switching, and lifecycle recovery on
  Android/iOS. ONNX model validation is deferred while AI capture is disabled.
- Foreground/background/terminated FCM delivery and notification routing.
- Two-device LiveKit monitor/viewer sessions, reconnect, heartbeat expiry, and
  camera handoff.
- Signed Android App Bundle and iOS archive builds.
- Web HTTPS camera, Google sign-in, App Check, and push behavior.

The visual matrix remains a test-only fixture harness and requires a supported
Android or iOS integration-test device.
