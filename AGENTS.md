# Project Overview

OceanEyes is a Flutter aquarium-monitoring application for
Android, iOS, and Flutter web. The shipped app has Firebase,
camera, ML models, messaging, and LiveKit integrations. The idea of the app is to have 2 mobile phone: one as monitor(camera) to livestream and ML inference fish tank video, and one as the viewer through this single app.

The current state of app is in MVP product, so the main focus of development is to ship this to early-access testers as soon as possible while having AI features and cloud auth. The first platform priority of the development is Android mobile phone.

## Tech Stack

- Framework: Flutter and Dart
- UI: Material widgets, custom painters, and bundled assets
- Icons: Lucide Flutter
- Persistence: SharedPreferences repositories
- Integrations: Firebase Auth/Firestore/FCM, camera/ONNX ML, LiveKit, and
  Firebase Cloud Functions
- Architecture: MVVM

## Preferred Behavior

- Preserve the MVVM boundary and keep domain policy out of widgets. Prefer shared
tokens and reusable UI primitives over repeated raw values.

- Simplicity First, Minimum code that solves the problem. Nothing speculative. Combat the tendency toward overengineering.