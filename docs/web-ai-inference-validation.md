# Flutter Web AI inference validation

Last updated: 2026-08-25

## Automatic inference default

Manual browser inference is available when Web Workers, WebAssembly, and
OffscreenCanvas are supported. Automatic browser inference is disabled by
default until the target device matrix has passed. Enable it explicitly for a
validated build:

```sh
flutter run -d chrome --dart-define=OCEANEYES_WEB_AUTO_INFERENCE=true
```

Omit the flag, or set it to `false`, to keep automatic inference disabled.
Manual browser inference remains available independently of this flag.

The camera coordinator applies this setting separately from
`FishInferenceEngine`, so the native engine and its automatic behavior are
unchanged.

The browser worker loads the pinned ONNX Runtime Web module and WASM runtime
from jsDelivr, while model files remain on the app origin. Production web
deployments must permit that CDN origin; vendor the runtime before release if a
self-contained or offline deployment is required.

## Baseline result

The implementation was exercised locally in a Chromium browser against the
same full-size ONNX assets and `assets/images/aquarium_hero.png` used by the
native smoke test.

| Check | Native | Browser | Outcome |
| --- | ---: | ---: | --- |
| Fish count at detection threshold 0.35 | 4 | 4 | Pass |
| Turbidity FNU | 0.6728 | 0.6707 | Pass (absolute delta 0.0021) |
| Clarity score | 10.0 | 10.0 | Pass |
| Detector box alignment | Reference | Within about 0.004 normalized units | Pass |
| High-confidence species decisions | Reference | Same | Pass |
| Borderline species decisions | Reference | Differences below/near threshold | Needs device-matrix validation |

Browser providers were WASM for detection and clarity and WebGPU for species.
With cached models, worker execution was about 14–19 seconds on this development
machine. Initial execution, including session creation, was about 36 seconds;
the first wall-clock run including roughly 285 MB of model downloads was about
54 seconds. A WASM-only comparison produced the same decisions but was slower
for the classifier.

The current full-size model bundle makes the first automatic run expensive.
Optimized browser models remain strongly recommended before broad release.

## Required validation before opt-in

1. Run a fixed, versioned aquarium-frame corpus through native and each target
   browser. Compare fish count, normalized boxes, thresholded species IDs,
   confidence deltas, FNU, and clarity score.
2. Record cold download/session time and at least 20 cached runs on desktop and
   supported mobile browsers. Confirm the configured polling interval cannot
   create sustained inference pressure.
3. Check peak memory, tab stability, battery use, and thermals during a
   30-minute monitoring session.
4. Verify cancellation on navigation/disposal, WebGPU-to-WASM fallback, model
   download failure, offline cached behavior, and unsupported-browser messaging.
5. Store the corpus, runtime/model versions, device results, and acceptance
   thresholds with the release sign-off. Disable automatic inference for any
   browser/device combination that does not meet those thresholds.
