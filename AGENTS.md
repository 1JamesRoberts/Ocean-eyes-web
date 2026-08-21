# Project Overview

OceanEyes is a Flutter/Dart aquarium-monitoring client for Android, iOS, and
Flutter web. It uses deterministic fixtures for camera-, AI-, and
backend-dependent states so the interface remains testable without production
services. Production integrations are enabled explicitly with
`OCEANEYES_PRODUCTION=true`.

## Tech Stack

- Framework: Flutter and Dart
- UI: Material widgets, custom painters, and bundled assets
- Icons: Lucide Flutter
- Persistence: SharedPreferences repositories
- Integrations: Firebase Auth/Firestore/FCM, camera/ONNX ML, LiveKit, and
  Firebase Cloud Functions
- Architecture: MVVM

## Project Structure

- `lib/app/` contains app bootstrap, navigation, and production configuration.
- `lib/models/` contains domain entities, repositories, persistence, and pure
  services and deterministic fixtures. It must not import Flutter UI code.
- `lib/view_models/` owns state, transitions, route intent, and coordinators;
  `OceanEyesController` is the interface's public state API.
- `lib/integrations/` contains Firebase, camera, ML, LiveKit, and wake-lock
  gateways.
- `lib/ui/` contains screens, shell layout, widgets, rendering, and event
  wiring.
- `lib/core/theme/` contains shared visual tokens and theme configuration.
- `assets/` contains bundled fonts, images, and ML model assets.
- `functions/` contains Firebase Cloud Functions and their tests.
- `test/` contains unit, widget, and production-boundary tests;
  `integration_test/` contains visual-matrix tests.
- `docs/` contains production and visual validation documentation.
- `tool/` contains project-specific validation utilities.

## Preferred Behavior

Preserve the MVVM boundary and keep domain policy out of widgets. Prefer shared
tokens and reusable UI primitives over repeated raw values. Before handoff,
run `dart format`, `flutter analyze`, relevant tests, and documented builds.
Keep production services behind the runtime switch; fixture URLs must remain
independent of Firebase, camera, messaging, LiveKit, and ONNX.
