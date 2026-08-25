# Production ONNX models

OceanEyes bundles three ONNX models for native and browser on-device aquarium
analysis. Android remains the primary target. Flutter Web selects a dedicated
ONNX Runtime Web worker implementation; other unsupported platforms retain the
stub.

Web model sessions load lazily. Camera pixels and results remain in the browser,
with WASM as the compatibility path and optional WebGPU acceleration. Automatic
browser polling is enabled by default and can be disabled with the documented
build flag; see `docs/web-ai-inference-validation.md`.

The binaries total roughly 285 MB and are tracked with Git LFS. Install Git LFS
before cloning or checking out a release:

```sh
git lfs install
git lfs pull
```

After checkout, `git lfs ls-files` must list all three files below. A small text
file beginning with `version https://git-lfs.github.com/spec/v1` is an LFS
pointer, not a usable model binary.

## Required assets and checksums

Use these exact runtime names and approved SHA-256 hashes:

```text
assets/models/fish_detector.onnx
84aca2b5d45dec8c3e4d045d419850e9cf765240fa6a1603fa60e68457157004

assets/models/species_classifier.onnx
e1627d87a85dc55a25e485b7a01ffaa1c206558753ed6d0268b5e1d34029c2c8

assets/models/water_clarity.onnx
9c32530b9787512b6514fefcb78e9225c0156549f32d0219f3627f40bf266c7a
```

The Android Gradle build keeps `.onnx` assets uncompressed so ONNX Runtime can
load them reliably. The resulting release is intended for direct APK or
Firebase App Distribution during early access. The model bundle is too large
for a Google Play base module; Play distribution will require Play Asset
Delivery or a controlled post-install model download.

## Exact graph contract

All three exports use ONNX opset 17 and float32 tensors.

### `fish_detector.onnx` — RF-DETR-Medium

- Input `input`: `[1,3,576,576]`, NCHW.
- Preprocessing: resize to 576×576, RGB `/255`, then ImageNet normalization
  with mean `[0.485,0.456,0.406]` and standard deviation
  `[0.229,0.224,0.225]`.
- Output `dets`: `[1,300,4]` normalized `cx,cy,width,height` boxes.
- Output `labels`: `[1,300,2]` logits.
- A query is retained when `sigmoid(max(labels[query]))` meets the configurable
  detection threshold. The deployed pipeline does not apply NMS.

### `species_classifier.onnx` — MobileNetV4

- Input `input`: `[N,3,224,224]`, dynamic-batch NCHW.
- Preprocessing per detector crop: resize the shorter side to 256, center-crop
  224×224, then apply ImageNet normalization.
- Output `output`: `[N,24]` logits. Softmax argmax is retained when it meets the
  configurable classification threshold.
- Classification work is capped at 64 crops per frame by default.

Class order is fixed:

```text
angelfish, betta, black_skirt_tetra, cardinal_tetra, cherry_barb,
clown_loach, corydoras, discus, dwarf_gourami, german_blue_ram,
goldfish, guppy, harlequin_rasbora, molly, neon_tetra, oscar,
otocinclus, platy, plecostomus, rummy_nose_tetra,
siamese_algae_eater, swordtail, tiger_barb, zebra_danio
```

### `water_clarity.onnx` — YOLO turbidity classifier

- Input `images`: `[1,3,224,224]`, NCHW.
- Preprocessing: resize the full frame to 224×224 and divide RGB by 255 only.
- Output `output0`: `[1,11]` softmaxed turbidity-range probabilities.
- Raw turbidity is calculated as:

  ```text
  FNU = -60.9 + sum(coefficient[i] * probability[i])
  coefficients = [61.34, 61.57, 62.48, 65.53, 67.76, 73.91,
                  77.63, 85.64, 94.0, 102.85, 114.32]
  ```

Production readings persist both `turbidity_fnu` and the legacy-compatible
`clarity`/`clarity_score`. Fish centers are normalized to the full captured
frame after water-line ROI inference.
