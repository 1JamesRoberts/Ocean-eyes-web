# 🐟 OceanEyes Web: AI Fish Monitoring & Aquarium Diagnostics Portal

OceanEyes Web is a modern, high-performance web dashboard designed to monitor smart aquariums in real-time. The application provides advanced diagnostics (pH, temperature, water clarity, chemical balances) alongside active computer vision feeds that count, classify, and track fish species in real-time.

---

## 🚀 Key Features

*   **Real-Time Diagnostics Panel**: High-fidelity monitoring of critical aquarium health indicators (pH, temperature, clarity, and chemistry metrics).
*   **AI Fish Detection & Classification**: Automated integration with computer vision models to count live fish, classify species (e.g., Neon Tetra, Guppy, Corydoras), and calculate inference confidence scores.
*   **IoT Simulator Console**: Split-screen simulator enabling developers and operators to mock data streams, inject anomalies, and verify dashboard telemetry instantly.
*   **Premium Web-Native Design**: Tailored responsive full-screen grid built with native Vanilla CSS, using a curated HSL color palette, smooth transitions, and sleek glassmorphism effects.

---

## 🛠️ Technology Stack

*   **Frontend Library**: React 18+ (TypeScript)
*   **Build System & HMR**: Vite
*   **Styling**: Vanilla CSS (CSS Custom Variables with HSL colors)
*   **Iconography**: Lucide React (`lucide-react`)
*   **Datastore/Mocking**: LocalStorage-backed simulation model (`src/models/repositories/storageBase.ts`) emulating real-time Firestore synchronization.

---

## 📂 Directory Scaffolding

```text
C:\Hope\Project\Ocean-eyes-web/
├── .agents/                 # AI Agent workflows, skills, and configurations
│   └── skills/
│       ├── planner/         # Task decomposition guidelines
│       └── code-reviewer/   # Linting, naming conventions, and modularity rules
├── public/                  # Static assets & favicons
├── src/
│   ├── assets/              # SVGs, images, local media
│   ├── hooks/               # React hooks: state, side effects, lifecycle
│   │   ├── pages/           # Page-level hooks
│   │   └── live/            # Live camera / AI hooks
│   ├── models/              # Data access, persistence, and pure helpers
│   │   ├── repositories/    # localStorage primitives + CRUD helpers
│   │   ├── services/        # Pure domain logic & transformers
│   │   └── api/             # FastAPI backend client
│   ├── components/          # UI components by feature
│   ├── pages/               # Route-level components
│   │   ├── ViewerApp.tsx    # Customer dashboard views
│   │   └── IoTMonitor.tsx   # IoT Scanner Console
│   ├── context/             # React Context providers
│   ├── App.tsx              # Sidebar dashboard layout entry point
│   ├── index.css            # Premium CSS variable design system
│   └── main.tsx             # DOM bootstrapper & entry script
├── .gitignore
├── AGENTS.md                # Project architecture & AI conventions guide
└── package.json             # NPM dependencies & manifest
```

---

## ⚙️ Operational Commands

Run the following commands in the project root to install, develop, lint, or build the application:

### 1. Installation
Install project dependencies:
```bash
npm install
```

### 2. Local Development
Launch the local Vite development server with hot module reloading (HMR):
```bash
npm run dev
```

### 3. Verification & Linting
Validate type conventions and syntax consistency:
```bash
npm run lint
```

### 4. Build Compilation
Compile, optimize, and bundle the application into static assets for production deployment:
```bash
npm run build
```

---

## 🩺 AI Disease Diagnosis Setup

The OceanEyes diagnostics portal supports automated hourly fish disease diagnosis using a vision-capable LLM (such as Gemini 2.5 Flash, OpenAI GPT-4o-mini, or a local model running via Ollama).

To configure the LLM integration on the backend:

1. Create a `.env` file inside the `ai/` directory:
   ```ini
   # ai/.env
   LLM_API_URL=your-url
   LLM_MODEL=your-model-name
   LLM_API_KEY=your-api-key
   ```

2. Launch the FastAPI server:
   ```bash
   python ai/api_server.py
   ```
   The backend will automatically load these variables on boot, slice fish crops during scheduled diagnostic runs, and query the LLM. Results will populate the dashboard panel and generate critical system alerts if diseases are detected.

---

## 🤖 Custom AI Agent Tooling

This project integrates specialized AI assistant skills located inside the `.agents/` folder. Developers or AI assistants can invoke these tools during pair programming sessions:

### Code Review & Health Scanner
An automated static analysis scanner checks for file complexity, TypeScript `any` leaks, naming conventions, hardcoded secrets, and async error boundaries.

To execute a codebase health scan:
```bash
node .agents/skills/code-reviewer/scripts/code_health_checker.cjs
```
This utility returns details on file scale, component naming patterns, type-safety degradation, and security vulnerabilities.
