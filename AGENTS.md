# Project Overview

OceanEyes is a Flutter/Dart aquarium-monitoring client for Android, iOS, and
Flutter web. It uses deterministic fixtures for camera-, AI-, and
backend-dependent states so the interface remains testable without production
services.

## Tech Stack

- Framework: Flutter and Dart
- UI: Material widgets, custom painters, and bundled assets
- Icons: Lucide Flutter
- Persistence: SharedPreferences repositories
- Architecture: MVVM

## Project Structure

- `lib/models/` contains domain entities, repositories, persistence, and pure
  services. It must not import Flutter UI code.
- `lib/view_models/` owns application state, transitions, and route intent. It
  is the public state API consumed by the interface.
- `lib/ui/` contains screens, shell layout, widgets, rendering, and event
  wiring.
- `lib/core/theme/` contains shared visual tokens and theme configuration.
- `assets/` contains bundled fonts and images.
- `test/` and `integration_test/` contain widget, model, and visual-matrix
  coverage.
- `docs/` documents visual tokens and screenshot validation.
- `tool/` contains project-specific validation utilities.

## Preferred Behavior

Preserve the MVVM boundary and keep domain policy out of widgets. Prefer shared
tokens and reusable UI primitives over repeated raw values. Before handing off
changes, run `dart format`, `flutter analyze`, and the relevant Flutter tests.
