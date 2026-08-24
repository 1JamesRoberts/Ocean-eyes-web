# Project Overview

OceanEyes is a Flutter-based aquarium monitoring application for Android, iOS, and web. The production app integrates Firebase, camera access, on-device ML models, messaging, and LiveKit.

The core concept uses two mobile phones within the same app: one acts as the monitor, using its camera to livestream the aquarium and run ML inference on the fish-tank video, while the other acts as the viewer, allowing the user to remotely watch the stream of the aquarium.

The app is currently an MVP. Prioritize shipping to early-access testers as quickly as possible while retaining the essential AI features and cloud authentication. Android mobile is the first and primary platform. Avoid work that does not directly support the MVP release, unless I ask for them.

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

- Simplicity First: Use the minimum code necessary to solve the current problem. Avoid speculative abstractions, and unnecessary complexity. Actively resist overengineering.

- When talking with me, assume I’m a technical manager rather than a deeply technical person. Keep explanations high-level, practical, and focused on what matters, why it matters, and what action or decision is needed. Avoid unnecessary technical details unless I ask for them.