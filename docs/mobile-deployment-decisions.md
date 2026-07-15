# Mobile Prototype Deployment Decisions

**Status:** Accepted for P0  
**Last updated:** 2026-07-15

## Goal

Deploy OceanEyes as a mobile-first prototype that invited testers can open on
their phones, grant access to their own camera, and eventually use for private,
on-device aquarium inference.

The current Sites deployment is available at
<https://oceaneyes-prototype.thammatorn-j.chatgpt.site>. It is owner-only and
requires the permitted OpenAI account to sign in. The deployed UI and camera
flow are functional, but AI inference still depends on the local FastAPI
backend and is therefore not yet a complete P0 release.

## Accepted Decisions

| Area | Decision |
| --- | --- |
| Audience | Begin with private testers rather than public anonymous access or full application accounts. |
| Initial access | The requested distribution method was an unlisted URL. The current Sites deployment is more restrictive: owner-only access. Tester sharing still needs an explicit access-policy decision. |
| Camera | Support the user's phone or computer camera through browser permission. Remote IP/IoT aquarium cameras are outside P0. |
| AI location | Run fish detection, species classification, and turbidity estimation on the user's device. |
| Disease diagnosis | Disable disease diagnosis for P0. The existing vision-LLM diagnosis uploads a crop and is not local. |
| Data | Store settings and inference history on the device. Do not add account synchronization or cloud backup in P0. |
| Existing history | Start fresh. Do not migrate the FastAPI JSONL history into the deployed prototype. |
| Offline behavior | After the first successful application and model download, camera inference and local history should continue to work offline. |
| Device support | Target modern phones and desktop browsers, using WebGPU when available and WebAssembly as the compatibility fallback. |
| Slow devices | Allow inference to run slowly instead of disabling AI or uploading frames to a cloud fallback. Never queue stale frames. |
| Model distribution | Model files may be downloaded, inspected, and copied by testers; this is an accepted tradeoff of browser inference. |
| Model size | No hard first-download size limit was selected. The current three ONNX models total approximately 300 MB, so the UI must disclose size and show download progress. |
| Hosting | No provider was selected during planning. The current prototype was subsequently deployed through OpenAI Sites. |

## P0 Architecture

Introduce one inference seam used by the live-camera hooks:

```ts
interface AquariumInference {
  initialize(): Promise<InferenceCapabilities>;
  analyzeFrame(
    source: ImageBitmap,
    options: InferenceOptions,
  ): Promise<AIDetectionResult>;
  dispose(): Promise<void>;
}
```

The production adapter will use ONNX Runtime Web in a dedicated Web Worker.
It will prefer WebGPU and fall back to WebAssembly. Model sessions remain
loaded between frames, only one frame is processed at a time, and the next
capture is scheduled after the previous inference completes.

Python and browser implementations must have golden parity tests for image
resizing, RGB order, normalization, tensor layout, bounding boxes, sigmoid and
softmax calculations, classification thresholds, and turbidity calculation.

Use IndexedDB for inference history, model metadata, and any large local
artifacts. Keep `localStorage` limited to small preferences. Provide history
export, delete-all, quota-error handling, and automatic retention once the
retention policy is finalized.

## Required Release Gates

- `npm run build` and `npm test` pass in CI.
- Production contains no `localhost` dependency for AI, health, or history.
- The app is served over HTTPS and handles camera denial or unavailability.
- Frames remain on-device during core inference.
- Model download requires clear progress and bandwidth disclosure.
- Browser results match the Python reference outputs within defined tolerances.
- Unsupported execution providers fall back cleanly without losing the rest of
  the dashboard.
- Local data can be exported and completely deleted.
- Privacy copy states what remains on-device and that disease diagnosis is not
  available in P0.

## Decisions Still Open

These choices were not completed during the interview and must be resolved
before calling P0 release-ready:

1. Local history retention: 7 days, 30 days, or until the user deletes it.
2. Model download trigger: explicit “Enable local AI” action or automatic
   loading.
3. Browser release matrix: Chrome-first, mobile Chrome plus Safari, or all
   major browsers.
4. Tester access: keep owner-only Sites access, add named testers, or move to a
   public/unlisted deployment.

## Out of Scope for P0

- Remote aquarium/IP-camera streaming.
- Cloud frame inference or automatic cloud fallback.
- Cloud disease diagnosis.
- User accounts, cross-device sync, and multi-user tank ownership.
- Importing historical FastAPI JSONL files.
