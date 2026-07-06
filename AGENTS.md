# Project Overview

## The current branch is for Mobile webapp prototype

OceanEyes is a React + TypeScript dashboard for real-time AI aquarium monitoring. It combines computer vision (fish detection, species classification, turbidity) with water chemistry telemetry. The current state is still prototype.

## Tech Stack

Framework: React 19 + TypeScript 6
Build: Vite 8
Styling: Tailwind CSS v4
Charts: Recharts
Icons: Lucide React
State: React Context + localStorage (mock Firestore)
AI Backend: Python FastAPI + ONNX models (port 8000)

## Key Architecture

The app use MVVM (Model-View-ViewModel) architecture

- **Hooks** (`src/hooks/`) — React hooks that own state, side effects, and lifecycle. They are the public API that components consume.
- **Model** (`src/models/`) — Data access, persistence, transport, and pure domain helpers. No React imports.
- **UI** (`src/components/`, `src/pages/`) — JSX, Tailwind classes, and event wiring.

Tailwind CSS v4 is the default and preferred styling system for all UI work. Avoid writing custom CSS except for values that cannot be expressed with utilities.

## run ``npm run lint`` only if necessary
