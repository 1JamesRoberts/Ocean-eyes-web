# Firebase Hosting

OceanEyes uses classic Firebase Hosting as a static Vite application. Browser inference remains on-device; Firebase serves the application, Web Worker, ONNX Runtime Web runtime, and optimized ONNX models over HTTPS.

The repository's default Firebase project is `ocean-eyes-webapp`. The current `prototype` preview channel is <https://ocean-eyes-webapp--prototype-vw2jtjzu.web.app> and expires on 2026-07-22.

## One-time setup

1. Install dependencies with `npm install`.
2. Generate the optimized models if `ai/models/web/*.onnx` is absent:

   ```sh
   python scripts/optimize-web-models.py
   ```

3. Authenticate the local Firebase CLI:

   ```sh
   npx firebase login
   ```

4. Select an existing Firebase project or create one in the Firebase console, then associate this repository with it:

   ```sh
   npx firebase use --add
   ```

   Choose an alias such as `default`. The command creates `.firebaserc`; commit that file because it contains only the public Firebase project identifier, not credentials.

## Validate locally

Run the normal production build:

```sh
npm run build
```

The build verifies each optimized model against `ai/models/model-manifest.json` and copies it to `dist/models`. To test the exact Hosting configuration locally:

```sh
npm run firebase:emulate
```

## Deploy a prototype preview

```sh
npm run firebase:preview
```

This deploys the `prototype` preview channel and prints a temporary shareable HTTPS URL. Anyone who receives a Firebase preview URL can open it; it is not an authentication boundary.

## Deploy live

After iPhone verification:

```sh
npm run firebase:deploy
```

The hosting configuration in `firebase.json` provides:

- SPA fallback to `index.html`;
- camera permission policy;
- Content Security Policy;
- COOP and COEP headers required for multithreaded ONNX Runtime Web WASM;
- immutable one-year caching for versioned models and hashed Vite assets.

Firebase CDN caching does not by itself make inference available offline. Offline-after-first-download still requires a service worker that explicitly caches the application and model responses.
