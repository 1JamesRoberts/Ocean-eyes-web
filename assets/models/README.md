# Production ONNX models

The Flutter production integration expects three private ONNX assets in this
directory. Model binaries are deliberately excluded from Git: the full set is
about 285 MB, two files exceed GitHub's 100 MB per-file limit, and the artifacts
belong to the FishAI training pipeline rather than this presentation repository.

## Required files

Copy the approved training exports into place and use these exact names:

```text
assets/models/fish_detector.onnx          # ~115 MB
assets/models/species_classifier.onnx     # ~32 MB
assets/models/water_clarity.onnx          # ~138 MB
```

Example local-only setup:

```sh
cp <private-training-output>/fish_detection.onnx assets/models/fish_detector.onnx
cp <private-training-output>/species_classifier.onnx assets/models/species_classifier.onnx
cp <private-training-output>/turbidity.onnx assets/models/water_clarity.onnx
```

Do not commit the copied files. Before a release, obtain the model files from
the project owner through the approved private artifact channel and verify their
checksums against that release's artifact manifest.

The app can still run deterministic fixtures and web builds without the files.
Native production startup reports ML initialization as failed until all three
are installed. ONNX execution is intentionally unavailable in the web build.

## Exact model contract

### `fish_detector.onnx` — RF-DETR-Medium

- Input `input`: `[1,3,576,576]`, NCHW float32.
- Preprocessing: resize to 576×576, RGB `/255`, then ImageNet normalization
  with mean `[0.485,0.456,0.406]` and standard deviation
  `[0.229,0.224,0.225]`.
- Output `dets`: `[1,300,4]` normalized `cx,cy,width,height` boxes.
- Output `labels`: `[1,300,2]` logits.
- A query is a fish when `sigmoid(max(labels[query]))` meets the configurable
  detection threshold (legacy default `0.3`). The deployed pipeline does not
  apply NMS.

### `species_classifier.onnx` — MobileNetV4

- Input `input`: `[N,3,224,224]`, dynamic-batch NCHW float32.
- Preprocessing per detector crop: resize the shorter side to 256, center-crop
  224×224, then apply the same ImageNet normalization as the detector.
- Output `output`: `[N,24]` logits; softmax argmax is retained when it meets the
  configurable classification threshold (legacy default `0.3`).
- Batch work is capped at 64 crops per frame by default. The total detector
  count still includes every passing detector query.

Class order is fixed and must match the training metadata:

```text
angelfish, betta, black_skirt_tetra, cardinal_tetra, cherry_barb,
clown_loach, corydoras, discus, dwarf_gourami, german_blue_ram,
goldfish, guppy, harlequin_rasbora, molly, neon_tetra, oscar,
otocinclus, platy, plecostomus, rummy_nose_tetra,
siamese_algae_eater, swordtail, tiger_barb, zebra_danio
```

These names are canonical classifier/species IDs. Firestore compatibility
mappers are responsible for resolving any legacy catalog aliases.

### `water_clarity.onnx` — YOLO turbidity classifier

- Input `images`: `[1,3,224,224]`, NCHW float32.
- Preprocessing: resize the full, uncropped frame to 224×224 and divide RGB by
  255 only. Do not apply ImageNet normalization.
- Output `output0`: `[1,11]` already-softmaxed turbidity-range probabilities.
- Raw turbidity is calculated as:

  ```text
  FNU = -60.9 + sum(coefficient[i] * probability[i])
  coefficients = [61.34, 61.57, 62.48, 65.53, 67.76, 73.91,
                  77.63, 85.64, 94.0, 102.85, 114.32]
  ```

- The compatibility clarity score maps approximately `0.44..53.42 FNU` to
  `10..1`, clamps to that range, and rounds to one decimal place.

Production readings must persist both `turbidity_fnu` (the raw result) and the
legacy-compatible `clarity`/`clarity_score` value. Fish boxes are normalized to
the full captured frame after water-line ROI inference.
