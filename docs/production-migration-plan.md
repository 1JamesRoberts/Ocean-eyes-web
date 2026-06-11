# OceanEyes Production Migration Plan

## Stack Decision

| Component | Choice |
|---|---|
| **Database** | Firebase Firestore |
| **Auth** | Firebase Auth |
| **File storage** | Firebase Storage |
| **AI inference** | RunPod (Dockerized FastAPI + ONNX) |
| **Live video** | Mux (HLS) or LiveKit (WebRTC) |
| **Frontend hosting** | Vercel / Firebase Hosting |

---

## Phase 0 — Project Setup

### 0.1 Create Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com/), create a project.
2. Enable **Firestore Database** (start in test mode, lock down after Phase 2).
3. Enable **Authentication** — at minimum Email/Password.
4. Enable **Storage** (for fish crop images).
5. Register a Web app in Project Settings → **Add app** → copy the config object.

### 0.2 Install Firebase SDK

```bash
npm install firebase
```

### 0.3 Prepare RunPod

1. Create account at [runpod.io](https://www.runpod.io/).
2. Create a Docker image for the AI backend (see Phase 4).

---

## Phase 1 — Live Video Pipeline

### 1.1 Why not Firebase for streaming

Firebase cannot serve live video — it has no media server, transcoding, or streaming distribution. It **can** store metadata (HLS URLs, stream keys, recording references) and handle auth/access control for viewers.

You need a dedicated live video service alongside Firebase.

### 1.2 Recommended options

| Solution | Type | Ingest | Playback | Cost |
|---|---|---|---|---|
| **Mux** | Managed (HLS) | RTMP push | HLS via hls.js | Pay-as-you-go |
| **LiveKit** | Open-source (WebRTC) | RTMP / SDK | WebRTC / HLS | Free tier + usage |
| **Cloudflare Stream** | Managed (HLS) | RTMP / SRT | HLS | Per-minute |
| **AWS IVS** | Managed (HLS) | RTMP | HLS | Per-hour |
| **Self-hosted nginx-rtmp** | DIY | RTMP | HLS | Server cost only |

**Recommendation:** **Mux** (simplest managed service) or **LiveKit** (more control, good JS SDK, can self-host).

### 1.3 Architecture overview

```
Camera (RTSP)
  │
  ▼
Encoder (FFmpeg / OBS / gstreamer)
  │  RTMP push
  ▼
Mux / LiveKit ───→ HLS / WebRTC URL
  │                    │
  │                    ▼
  │              Browser plays via
  │              hls.js or LiveKit SDK
  │
  └──→ Store streaming metadata in Firestore
       tanks/{tankId}/liveState/current
         └─ streamType: 'mux' | 'livekit' | 'hls'
         └─ streamUrl: 'https://stream.mux.com/...'
         └─ streamKey: '...'
         └─ isLive: boolean
         └─ startedAt: timestamp
```

### 1.4 Frontend changes

#### Install player library

```bash
# For Mux (HLS):
npm install hls.js

# For LiveKit:
npm install @livekit/components-react livekit-client
```

#### Create stream player component

**File: `src/components/live/LiveStreamPlayer.tsx`**

Replaces the current `CameraFeed` component's approach of trying to load an RTSP URL directly.

```tsx
// Mux / HLS version — uses hls.js to play HLS streams
import { useRef, useEffect } from 'react';
import Hls from 'hls.js';

interface Props {
  src: string;  // HLS URL from Firestore liveState
  poster?: string;
}

export const LiveStreamPlayer: React.FC<Props> = ({ src, poster }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
      return () => { hls.destroy(); };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari HLS support
      video.src = src;
    }
  }, [src]);

  return <video ref={videoRef} poster={poster} controls autoPlay />;
};
```

#### Update `CameraFeed.tsx`

Replace the current mock-image + RTSP logic with the `LiveStreamPlayer`:

```tsx
// Before: <img src={mockImage} /> or broken RTSP link
// After:
{liveState.streamType === 'hls' ? (
  <LiveStreamPlayer src={liveState.streamUrl} />
) : (
  <img src={mockImage} alt="Camera feed" />
)}
```

### 1.5 Camera-to-server ingestion

The camera pushes RTSP to an encoder running on a lightweight server or Raspberry Pi near the tank:

```bash
# Using FFmpeg to convert RTSP → RTMP → Mux/LiveKit
ffmpeg -i "rtsp://oceaneyes.iot/live-stream-09" \
  -c:v libx264 -preset ultrafast -tune zerolatency \
  -f flv "rtmp://live.mux.com/app/{stream_key}"
```

- The encoder runs on-premise (customer's local network).
- It pushes to Mux/LiveKit's RTMP ingest endpoint.
- The frontend reads the resulting HLS/WebRTC URL from Firestore and plays it.

### 1.6 Firestore document shape for stream metadata

Update the `liveState/current` document to include streaming info:

```ts
tanks/{tankId}/liveState/current
  ├─ isLive: boolean
  ├─ streamType: 'mux' | 'livekit' | 'hls' | 'mock'
  ├─ streamUrl: string           // HLS or WebRTC URL for playback
  ├─ streamKey: string           // RTMP stream key (server-side only)
  ├─ ingestUrl: string           // RTMP endpoint for encoder
  ├─ startedAt: string | null
  ├─ lastPingAt: string | null
  ├─ currentClarity: number
  ├─ currentFishCount: number
  ├─ selectedFeedId: string
  └─ feeds: [{ id, name, streamUrl, isLive, ... }]
```

### 1.7 Security — stream access control

**Option A — Signed URLs (Mux):** Mux can generate signed playback IDs that expire. Store the signing key server-side (RunPod), issue short-lived tokens.

**Option B — LiveKit token:** LiveKit requires a JWT token for each viewer. Generate tokens from a small server endpoint or a Firebase Cloud Function.

**Option C — Firestore gate:** Store a viewer list in Firestore. The frontend checks `allowlist` before showing the player. Simpler but less secure.

Recommended: **Option B** (LiveKit JWT) or **Option A** (Mux signed URLs) for production.

### 1.8 Files to create / modify

| File | Action | Purpose |
|---|---|---|
| `src/components/live/LiveStreamPlayer.tsx` | **Create** | HLS/WebRTC video player component |
| `src/components/live/CameraFeed.tsx` | **Modify** | Use `LiveStreamPlayer` instead of mock image |
| `src/services/firestoreService.ts` | **Modify** | Add `streamUrl`, `streamType`, `streamKey` to liveState |
| `src/types/aquarium.ts` | **Modify** | Add streaming fields to `LiveState` / `CameraFeed` |
| `src/hooks/useLiveState.ts` | **Modify** | No changes needed if it already subscribes to the full liveState doc |

---

## Phase 2 — Firebase Auth (replace `anon-user-123`)

### 1.1 Create Firebase config

**File: `src/services/firebase.ts`**

```ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
```

### 1.2 Create Auth context

**File: `src/context/AuthContext.tsx`**

- Wraps the app, provides `user`, `loading`, `signIn`, `signUp`, `signOut`.
- Uses `onAuthStateChanged` to track the current Firebase user.

```tsx
// AuthContext.tsx — skeleton
import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { auth } from '../services/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// ... provider implementation
export const useAuth = () => { /* ... */ };
```

### 1.3 Add login/signup UI

**Files:**

| File | Purpose |
|---|---|
| `src/components/auth/LoginScreen.tsx` | Email/password login form |
| `src/components/auth/SignUpScreen.tsx` | Registration form |
| `src/components/auth/AuthGuard.tsx` | Redirects unauthenticated users to login |

### 1.4 Files to modify

| File | Change |
|---|---|
| `src/services/localStorageStore.ts` | Accept `userId` param instead of hardcoded `anon-user-123` |
| `src/hooks/useTank.ts` | Use `useAuth().user.uid` for tank ownership |
| `src/pages/ViewerApp.tsx` | Wrap with `AuthProvider` |
| `src/App.tsx` | Add routing for login/signup screens |

---

## Phase 3 — Firestore Database (replace localStorage)

### 3.1 Data model — Firestore collections

```
users/{userId}
  └─ displayName, email, createdAt

users/{userId}/tanks/{tankId}
  └─ name, createdAt, thresholds: { clarityMin, fishChangePct },
     calibration: { waterLineY }

tanks/{tankId}/fish/{fishId}
  └─ speciesId, name, imageUrl, count, detected

tanks/{tankId}/readings/{readingId}
  └─ timestamp, clarity, fishCount, fishCountConfidence,
     ph, temp, ammonia, nitrite, frameUrl

tanks/{tankId}/alerts/{alertId}
  └─ title, message, tip, severity, resolved, timestamp,
     clarityBefore, clarityAfter, fishBefore, fishAfter

tanks/{tankId}/liveState/current     ← single document
  └─ isLive, streamUrl, startedAt, lastPingAt,
     currentClarity, currentFishCount,
     selectedFeedId, feeds: [...]
```

### 3.2 Create Firestore service

**File: `src/services/firestoreService.ts`**

Replace every method from `LocalStorageStore` with a Firestore equivalent.

| `LocalStorageStore` method | `FirestoreService` replacement |
|---|---|
| `getTanks()` / `saveTanks()` | `subscribeTanks(userId, callback)` — `onSnapshot` on `users/{uid}/tanks` |
| `getFish()` / `saveFish()` | `subscribeFish(tankId, callback)` — `onSnapshot` on `tanks/{tid}/fish` |
| `getReadings()` / `saveReadings()` | `subscribeReadings(tankId, callback)` — `onSnapshot` ordered by timestamp desc, limit 50 |
| `getAlerts()` / `saveAlerts()` | `subscribeAlerts(tankId, callback)` — `onSnapshot` on `tanks/{tid}/alerts` |
| `getLiveState()` / `saveLiveState()` | `subscribeLiveState(tankId, callback)` — `onSnapshot` on single doc `liveState/current` |
| `createTank()` | `addDoc(collection(users/{uid}/tanks), ...)` |
| `joinTank()` | Remove — auth + security rules handle access |
| `writeReading()` | `addDoc(collection(tanks/{tid}/readings), ...)` |
| `addFish()` / `updateFishCount()` etc. | Direct Firestore doc writes |

**Subscriptions return unsubscribe functions** (exact same pattern as `subscribeToDb`):

```ts
// Pattern for each hook
export function subscribeReadings(
  tankId: string,
  callback: (readings: ReadingItem[]) => void
): () => void {
  const q = query(
    collection(db, 'tanks', tankId, 'readings'),
    orderBy('timestamp', 'desc'),
    limit(50)
  );
  return onSnapshot(q, (snapshot) => {
    const readings = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ReadingItem));
    callback(readings);
  });
}
```

### 3.3 Rewrite hooks

Each hook switches from `LocalStorageStore.getX()` + `subscribeToDb(syncX)` to Firestore `onSnapshot`:

| Hook | Subscribe to | Returns |
|---|---|---|
| `useTank` | `users/{uid}/tanks` | `{ tankId, tanks, activeTank, selectTank, createTank, ... }` |
| `useFish` | `tanks/{tankId}/fish` | `{ fishList, addFish, updateFishCount, removeFish, ... }` |
| `useReadings` | `tanks/{tankId}/readings` | `{ readings }` |
| `useAlerts` | `tanks/{tankId}/alerts` | `{ alerts, addAlert, resolveAlert }` |
| `useLiveState` | `tanks/{tankId}/liveState/current` | `{ liveState, saveLiveState, updateCalibration }` |

**Files to modify:**

| File | Change |
|---|---|
| `src/hooks/useTank.ts` | Replace `LocalStorageStore` → `firestoreService` + `onSnapshot` |
| `src/hooks/useFish.ts` | Same |
| `src/hooks/useReadings.ts` | Same |
| `src/hooks/useAlerts.ts` | Same |
| `src/hooks/useLiveState.ts` | Same |

### 3.4 Firestore Security Rules

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Tank data: only accessible by linked users
    match /tanks/{tankId}/{document=**} {
      allow read, write: if request.auth != null
        && exists(/databases/$(database)/documents/users/$(request.auth.uid)/tanks/$(tankId));
    }
  }
}
```

### 3.5 Files to delete

| File | Reason |
|---|---|
| `src/services/localStorageStore.ts` | Entirely replaced by Firestore |
| `src/services/chemistrySimulator.ts` | No longer needed (backend provides real data) |
| `src/hooks/useDataSync.ts` | Polling pattern no longer needed |

---

## Phase 4 — Firebase Storage (replace local crop images)

### 4.1 Python backend — upload crops to Firebase Storage

**`ai/requirements.txt` — add:**

```
firebase-admin
```

**`ai/api_server.py` — initialize Firebase Admin SDK:**

```python
import firebase_admin
from firebase_admin import credentials, storage

if os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON"):
    cred_dict = json.loads(os.environ["FIREBASE_SERVICE_ACCOUNT_JSON"])
    cred = credentials.Certificate(cred_dict)
    firebase_admin.initialize_app(cred, {
        "storageBucket": os.environ["FIREBASE_STORAGE_BUCKET"]
    })
```

**Replace local file writes:**

- Instead of saving crop images to `CROP_OUTPUT_DIR`, upload to `gs://{bucket}/crops/{filename}`.
- Instead of `append_jsonl()` for detections and turbidity, write directly to Firestore:
  - `db.collection("tanks").document(tankId).collection("readings").add({...})`
- Return Firebase Storage URLs instead of `/crops/...` paths.

### 4.2 Frontend — update type

In `src/types/aquarium.ts`:
- `FishDiagnosis.crop_url` already expects a URL string — stays compatible.

### 4.3 Storage Security Rules

```js
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /crops/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && request.resource.metadata.userId == request.auth.uid;
    }
  }
}
```

---

## Phase 5 — RunPod (deploy AI inference)

### 5.1 Dockerfile

**File: `ai/Dockerfile`**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "api_server:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 5.2 Build & push Docker image

```bash
docker build -t yourdockerhub/oceaneyes-ai:latest ./ai
docker push yourdockerhub/oceaneyes-ai:latest
```

### 5.3 Deploy on RunPod

1. Go to RunPod → **Serverless** → **Create Endpoint**.
2. Select your Docker image.
3. Set **Idle Timeout** to 30s (balance cold-start vs cost).
4. Set **Max Workers** to 2–5 (scale based on expected load).
5. Add environment variables:

   | Variable | Value |
   |---|---|
   | `FIREBASE_SERVICE_ACCOUNT_JSON` | Your Firebase Admin service account key (JSON) |
   | `FIREBASE_STORAGE_BUCKET` | Your Firebase Storage bucket name |
   | `CORS_ORIGINS` | Your frontend domain (e.g. `https://oceaneyes.app`) |

6. RunPod provides a **HTTP endpoint URL** — save this.

### 5.4 Frontend — update API URL

**File: `.env.production`**

```
VITE_AI_API_URL=https://your-runpod-endpoint-xxxx.runpod.net
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

**File: `vite.config.ts`** — remove the `/history` dev proxy:

```ts
// Remove this block:
server: {
  proxy: {
    '/history': 'http://localhost:8000',
  },
},
```

### 5.5 FastAPI — remove JSONL persistence

In `ai/api_server.py`:

- Remove `append_jsonl()` function calls from `POST /predict`, `POST /predict/detection`, `POST /predict/turbidity`.
- Remove `_read_jsonl_date_file()` function.
- Remove `GET /history/detections`, `GET /history/turbidity`, `DELETE /history/detections`, `DELETE /history/turbidity` endpoints.
- Remove `DETECTION_OUTPUT_DIR`, `TURBIDITY_OUTPUT_DIR` constants.
- Replace all with Firestore Admin SDK writes.

---

## Phase 6 — Frontend Cleanup

### 6.1 Files to delete

| File | Reason |
|---|---|
| `src/services/realDataService.ts` | Bridge between JSONL and app — no longer needed |
| `src/services/alertEngine.ts` | If alerts are still needed, move logic into Firestore rules or a Cloud Function |
| `src/services/chemistrySimulator.ts` | Real data from backend |
| `src/hooks/useDataSync.ts` | Polling no longer needed |
| `src/services/localStorageStore.ts` | (already deleted in Phase 2) |

### 6.2 Simplify `src/services/ai_service.ts`

- **Keep:** `captureFrame()`, `captureFrameFromUrl()`, `sendFrameForDetection()`, `sendFrameForTurbidity()`, `isBackendAvailable()`.
- **Remove:** `fetchDetectionHistory()`, `fetchTurbidityHistory()` — these queried JSONL files.
- History data is now accessed directly from Firestore via `useReadings`.

### 6.3 Simplify types

In `src/types/aquarium.ts`:

- **Keep:** `AIDetectionResult`, `AITurbidityResult`, `AIPredictionResult`, `AIDetection`, `AITurbidity`, `AISummary`, `FishDiagnosis`.
- **Remove:** `HistoryDetectionResponse`, `HistoryTurbidityResponse`, `HistoryDatesResponse`.

---

## Phase 7 — Deployment & CI/CD

### 7.1 Frontend hosting (Vercel)

```bash
npm install -g vercel
vercel --prod
```

Set all `VITE_*` environment variables in Vercel dashboard → Project Settings → Environment Variables.

### 7.2 Frontend hosting (Firebase Hosting alternative)

```bash
npm install -g firebase-tools
firebase init hosting
firebase deploy --only hosting
```

### 7.3 Data migration script

**File: `scripts/migrate-local-to-firestore.mjs`**

A one-off script that:
1. Reads `localStorage` data from the user's browser (or from exported JSON).
2. Maps to Firestore document structures.
3. Writes to Firestore via Firebase Admin SDK.

---

## Migration Timeline

| Phase | Tasks | Est. Days | Dependencies |
|---|---|---|---|
| **0** — Setup | Firebase project, RunPod account, install SDKs | 1 | None |
| **1** — Live Video | Mux/LiveKit setup, player component, encoder config | 3 | Phase 0 |
| **2** — Auth | Firebase config, AuthContext, login/signup UI | 2 | Phase 0 |
| **3** — Firestore | FirestoreService, rewrite 5 hooks, security rules | 5 | Phase 2 |
| **4** — Storage | Firebase Admin SDK in Python, upload crops | 1 | Phase 0 |
| **5** — RunPod | Dockerfile, deploy, remove JSONL endpoints | 3 | Phase 0, 4 |
| **6** — Cleanup | Delete dead files, simplify services, update vite config | 2 | Phase 3, 5 |
| **7** — Deploy | Vercel, env vars, migrate script | 1 | Phase 6 |

**Total: ~18 days** for a single developer.

---

## Risk Register

| Risk | Impact | Mitigation |
|---|---|---|---|
| Firestore read costs spike with camera polling | Cost | Batch readings; use subcollection with TTL; cache latest in a single doc |
| RunPod cold starts (serverless GPU) | Latency | Set idle timeout appropriately; consider reserved pod for consistent load |
| Firebase Admin SDK in Python — no `onSnapshot` | No real-time writes from backend | Backend writes docs normally; frontend's Firestore `onSnapshot` picks up changes immediately |
| CORS issues with RunPod | API calls fail | Ensure `CORS_ORIGINS` env var is set correctly in RunPod |
| Live video latency | Poor UX for viewers | Use WebRTC (LiveKit) for sub-second latency; HLS (Mux) adds 5–15s delay |
| RTSP → RTMP encoder failure | Stream goes offline | Add health checks; store last-known-good frame as fallback in Firestore |
| Unauthorized stream access | Security breach | Use signed URLs (Mux) or JWT tokens (LiveKit); never expose stream keys in client code |
| LocalStorage migration | Existing user data lost | Run the migration script once before switching; keep old data as backup |

---

## Appendix: Key file map

```
src/
├── components/
│   ├── auth/
│   │   ├── LoginScreen.tsx           ← NEW
│   │   ├── SignUpScreen.tsx          ← NEW
│   │   └── AuthGuard.tsx             ← NEW
│   └── live/
│       ├── LiveStreamPlayer.tsx      ← NEW — HLS/WebRTC player
│       ├── CameraFeed.tsx            ← MODIFY — Use LiveStreamPlayer
│       └── ...
├── services/
│   ├── firebase.ts                  ← NEW — Firebase app init
│   ├── firestoreService.ts          ← NEW — All Firestore CRUD + subscriptions
│   ├── authService.ts               ← NEW — Auth helper functions
│   ├── ai_service.ts                ← MODIFY — Remove history fetches
│   ├── localStorageStore.ts         ← DELETE
│   ├── realDataService.ts           ← DELETE
│   ├── alertEngine.ts               ← DELETE (or move)
│   └── chemistrySimulator.ts        ← DELETE
├── context/
│   ├── AuthContext.tsx               ← NEW — Auth React context
│   └── NavigationContext.tsx         ← unchanged
├── hooks/
│   ├── useTank.ts                    ← REWRITE — Firestore subscription
│   ├── useFish.ts                    ← REWRITE
│   ├── useReadings.ts                ← REWRITE
│   ├── useAlerts.ts                  ← REWRITE
│   ├── useLiveState.ts               ← REWRITE
│   └── useDataSync.ts               ← DELETE
├── components/
│   └── auth/
│       ├── LoginScreen.tsx           ← NEW
│       ├── SignUpScreen.tsx          ← NEW
│       └── AuthGuard.tsx             ← NEW
├── types/
│   └── aquarium.ts                  ← MODIFY — Remove history types
└── pages/
    └── ViewerApp.tsx                 ← MODIFY — Wrap with AuthProvider

ai/
├── Dockerfile                        ← NEW
├── api_server.py                    ← MODIFY — Use Firebase Admin SDK, remove JSONL
├── requirements.txt                 ← MODIFY — Add firebase-admin
└── inference.py                     ← MODIFY — Upload crops to Firebase Storage

.env.production                      ← NEW — All production env vars
```
