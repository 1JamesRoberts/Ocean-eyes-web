# Web AI inference progress

Last updated: 2026-07-15

## Status

P0 on-device AI inference is implemented on the `mobile-deploy` branch and passes local automated validation. The deployment implementation has been migrated to Firebase Hosting, which accepts the complete optimized model files. A Firebase preview deployment is available at <https://ocean-eyes-webapp--prototype-vw2jtjzu.web.app> until 2026-07-22.

The existing production URL, `https://oceaneyes-prototype.thammatorn-j.chatgpt.site`, should therefore not be treated as containing this inference implementation.

## Implemented

- Fish detection, species classification, and turbidity inference run in a dedicated browser Web Worker through ONNX Runtime Web.
- WebGPU is preferred for the floating-point species model. WASM is used for the quantized detection and turbidity models and is also the fallback execution provider.
- Models load lazily, inference is serialized to limit peak resource use, and the turbidity session is released after each measurement.
- Camera frames and inference results stay on the user's device. There is no cloud inference fallback.
- Existing detection and turbidity result contracts remain unchanged, so the UI and local history code can consume the new results.
- Browser capability replaces the former FastAPI backend-health check.
- Disease diagnosis is explicitly disabled for P0.
- Cross-origin isolation, camera permissions, content security policy, and immutable model caching headers are configured.
- Model hashes and sizes are verified during the build.
- The Firebase build copies complete model files into `dist/models` after verifying their hashes and sizes.
- Firebase supplies SPA routing, cross-origin isolation, security headers, camera permissions, and immutable model caching without a production application server.

## Browser models

The original models totaled about 299 MB. Browser-specific optimization reduced the first download to about 86 MB:

| Model | Format | Size | Loading |
| --- | --- | ---: | --- |
| Fish detection | Dynamic INT8 ONNX | 32,849,543 bytes | Lazy |
| Species classification | FP16 weights with FP32 input/output | 16,912,125 bytes | Lazy, after detection needs classification |
| Turbidity | Dynamic INT8 ONNX | 36,362,120 bytes | Lazy, when measurement is requested |

The generated `.onnx` files and deployment chunks are ignored by Git on the user-facing branch. Their expected SHA-256 hashes and byte sizes are tracked in `ai/models/model-manifest.json`, and `scripts/optimize-web-models.py` reproduces the optimized files.

## Verification completed

- `npm run build` passes.
- `npm test -- --run` passes: 28 test files and 105 tests.
- `npm run lint` reports no errors. It still reports 263 pre-existing warnings.
- All three optimized models load successfully in Python ONNX Runtime.
- Turbidity quantization produced the same class in the test comparison with a maximum absolute output difference of about 0.00025.
- Detection quantization produced 12 detections versus 11 for FP32 on the mock comparison at a 0.35 threshold, with similar top confidences.
- Species FP16 produced the same species decision for all 11 tested detection crops, with confidence differences below roughly 0.001.
- A build using only chunked source inputs passes and reconstructs complete files matching the manifest.

Real-device performance, memory use, camera behavior, and result parity have not yet been validated on an iPhone.

## Relevant commits

- `01130c3` — run aquarium inference on device
- `0e2cbce` — optimize browser model delivery
- `22ff3b9` — shrink the species model for deployment
- `74dbcd9` — support chunked model inputs during the build

## Deployment attempt and blocker

Sites source upload initially stalled when large ONNX files were stored as individual Git blobs. A temporary local branch named `sites-model-upload` split them into 4 MiB source chunks. Those chunks were pushed successfully to the Sites source repository in three commits, ending at `57a4bf9`.

Sites version 2 was saved and a private production deployment was started:

- Version ID: `appgprj_6a57537e48e48191aa8fd95473659e05~appgver_b9097bf5e9d88191a1cd617c2df3bc9e`
- Deployment ID: `appgdep_6a5768c2fa288191929ffa2c595b7e77`
- Final status: failed
- Failure: the reconstructed 32,849,543-byte detection model exceeds the host's 26,214,400-byte per-file limit

The deployment failed before publishing, so it did not replace the existing production version.

## Firebase migration

The Cloudflare Vite plugin, Worker entry point, and `.openai/hosting.json` have been removed. The application now builds as a conventional static Vite application. `firebase.json` defines the `dist` publish directory, SPA fallback, security headers, cross-origin isolation, and long-lived caching for hashed application assets and ONNX models.

The remaining deployment steps are:

1. Verify camera permission, WebGPU/WASM selection, memory pressure, thermals, and inference latency on a real iPhone.
2. Add visible model-download progress and confirm offline behavior after the first successful download.
3. Promote the tested build to the Firebase live channel.

The remote preview check confirmed SPA routing, HTTPS model availability, the expected ONNX content type, immutable model caching, camera permission policy, and the required COOP/COEP headers.
