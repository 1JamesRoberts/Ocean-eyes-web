# Project Overview

OceanEyes is a React + TypeScript dashboard for real-time AI aquarium monitoring. It combines computer vision (fish detection, species classification, turbidity). The current branch (mobile-ui)) is for Mobile webapp prototyp.

## Tech Stack

Framework: React 19 + TypeScript 6
Build: Vite 8
Styling: Tailwind CSS v4 (default and preferred styling system for all UI work. Avoid writing custom CSS except for values that cannot be expressed with utilities.)
Charts: Recharts
Icons: Lucide React
State: React Context + localStorage (mock Firestore)
AI Backend: Python FastAPI + ONNX models (port 8000)

## Project Structure & Module Organization

OceanEyes Web is a Vite + React + TypeScript dashboard. Main application code lives in `src/`: `pages/` contains route-level screens, `components/` is organized by feature, `hooks/` contains shared and page hooks, `context/` holds providers, and `models/` contains API clients, repositories, and pure services. Static assets live in `public/`, including generated fish crop images; source assets live in `src/assets/`. Tests are colocated in `__tests__/` directories under `src/`. The `ai/` directory contains the Python AI/FastAPI backend and model metadata; `scripts/` contains catalog utilities.

### Key Architecture

The app use MVVM (Model-View-ViewModel) architecture
- **Hooks** (`src/hooks/`) — React hooks that own state, side effects, and lifecycle. They are the public API that components consume.
- **Model** (`src/models/`) — Data access, persistence, transport, and pure domain helpers. No React imports.
- **UI** (`src/components/`, `src/pages/`) — JSX, Tailwind classes, and event wiring.