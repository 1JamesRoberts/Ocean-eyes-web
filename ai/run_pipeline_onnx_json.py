#!/usr/bin/env python3
"""
FishAI Pipeline JSON Output (ONNX)

Runs all 3 exported ONNX models on an input image and outputs structured JSON
suitable for real-time application integration (Flutter, video pipelines, etc.).

Output format:
{
  "timestamp": "2026-06-06T09:15:30.123456",
  "image": "path/to/image.jpg",
  "turbidity": {
    "fnu": 1.72,
    "top_class": "01-2.49",
    "top_confidence": 0.804,
    "all_probabilities": {"00-0.49": 0.01, ...}
  },
  "detections": [
    {
      "bbox": [x1, y1, x2, y2],
      "detection_confidence": 0.894,
      "species": "neon_tetra",
      "species_display": "Neon Tetra",
      "species_confidence": 0.764,
      "below_threshold": false
    }
  ],
  "summary": {
    "total_detections": 13,
    "species_counts": {"neon_tetra": 5, "guppy": 3, ...}
  }
}

Usage:
    python scripts/utils/run_pipeline_onnx_json.py path/to/image.jpg
    python scripts/utils/run_pipeline_onnx_json.py path/to/image.jpg --conf 0.5 > result.json
    python scripts/utils/run_pipeline_onnx_json.py path/to/image.jpg --output result.json
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

try:
    import onnxruntime as ort
except ImportError:
    print(
        json.dumps(
            {"error": "onnxruntime not installed. Install with: pip install onnxruntime"}
        ),
        file=sys.stderr,
    )
    sys.exit(1)

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ---------------------------------------------------------------------------
# ImageNet normalization constants
# ---------------------------------------------------------------------------
NORM_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
NORM_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

# ---------------------------------------------------------------------------
# ONNX Runtime provider selection (CUDA → DirectML → CPU)
# ---------------------------------------------------------------------------
# Suppress noisy provider-bridge logs (only FATAL messages)
ort.set_default_logger_severity(4)

PREFERRED_PROVIDERS = [
    "CUDAExecutionProvider",
    "DmlExecutionProvider",
    "CPUExecutionProvider",
]


def _test_provider(model_path: Path, provider: str) -> bool:
    """Try to create a session with a single provider to verify it works."""
    try:
        opts = ort.SessionOptions()
        opts.log_severity_level = 4
        _ = ort.InferenceSession(str(model_path), sess_options=opts, providers=[provider])
        return True
    except Exception:
        return False


def load_session(model_path: Path):
    """Load an ONNX inference session with best available provider."""
    if not model_path.exists():
        raise FileNotFoundError(f"ONNX model not found: {model_path}")

    # Try preferred providers in order, skipping any that fail to initialize
    for provider in PREFERRED_PROVIDERS:
        if provider not in ort.get_available_providers():
            continue
        if _test_provider(model_path, provider):
            opts = ort.SessionOptions()
            opts.log_severity_level = 4
            session = ort.InferenceSession(
                str(model_path), sess_options=opts, providers=[provider]
            )
            return session, provider

    # Fallback to CPU (should always work)
    opts = ort.SessionOptions()
    opts.log_severity_level = 4
    session = ort.InferenceSession(
        str(model_path), sess_options=opts, providers=["CPUExecutionProvider"]
    )
    return session, "CPUExecutionProvider"


def preprocess_detection(image: np.ndarray) -> np.ndarray:
    """Resize to 576×576 and apply ImageNet normalization."""
    img = cv2.resize(image, (576, 576))
    img = img.astype(np.float32) / 255.0
    img = (img - NORM_MEAN) / NORM_STD
    img = np.transpose(img, (2, 0, 1))  # HWC → CHW
    return np.expand_dims(img, axis=0)  # Add batch dim


def preprocess_species(image: np.ndarray, img_size: int = 224) -> np.ndarray:
    """Resize, center-crop, and apply ImageNet normalization."""
    resize_dim = int(img_size * 1.14)
    img = cv2.resize(image, (resize_dim, resize_dim))

    h, w = img.shape[:2]
    start_y = (h - img_size) // 2
    start_x = (w - img_size) // 2
    img = img[start_y : start_y + img_size, start_x : start_x + img_size]

    img = img.astype(np.float32) / 255.0
    img = (img - NORM_MEAN) / NORM_STD
    img = np.transpose(img, (2, 0, 1))
    return np.expand_dims(img, axis=0)


def preprocess_turbidity(image: np.ndarray, img_size: int = 224) -> np.ndarray:
    """Resize and scale to [0, 1] (YOLO handles normalization internally)."""
    img = cv2.resize(image, (img_size, img_size))
    img = img.astype(np.float32) / 255.0
    img = np.transpose(img, (2, 0, 1))
    return np.expand_dims(img, axis=0)


def softmax(x: np.ndarray) -> np.ndarray:
    """Numerically stable softmax."""
    e_x = np.exp(x - np.max(x, axis=-1, keepdims=True))
    return e_x / np.sum(e_x, axis=-1, keepdims=True)


def sigmoid(x: np.ndarray) -> np.ndarray:
    """Sigmoid activation."""
    return 1.0 / (1.0 + np.exp(-x))


def fmt_class_name(name: str) -> str:
    """Format a species class name for display."""
    return name.replace("_", " ").title()


def run_turbidity(image: np.ndarray, session: ort.InferenceSession, metadata: dict):
    """Run turbidity estimation and return structured results."""
    imgsz = metadata["input"]["preprocessing"]["resize"]
    input_tensor = preprocess_turbidity(image, imgsz)
    input_name = session.get_inputs()[0].name
    outputs = session.run(None, {input_name: input_tensor})
    probs = outputs[0].squeeze(0)  # (11,)

    # FNU calculation
    coeffs = metadata["output"]["postprocessing"]["fnu_calculation"]["coefficients"]
    constant = metadata["output"]["postprocessing"]["fnu_calculation"]["constant"]
    classes = metadata["classes"]

    fnu = constant + sum(coeffs[cls] * float(p) for cls, p in zip(classes, probs))

    top_idx = int(np.argmax(probs))
    top_class = classes[top_idx]
    top_conf = float(probs[top_idx])

    all_probs = {cls: float(p) for cls, p in zip(classes, probs)}

    return {
        "fnu": round(fnu, 2),
        "top_class": top_class,
        "top_confidence": round(top_conf, 6),
        "all_probabilities": all_probs,
    }


def run_detection(image: np.ndarray, session: ort.InferenceSession, conf: float):
    """Run detection and return list of (x1, y1, x2, y2, confidence)."""
    h_orig, w_orig = image.shape[:2]
    input_tensor = preprocess_detection(image)
    input_name = session.get_inputs()[0].name
    outputs = session.run(None, {input_name: input_tensor})

    dets = outputs[0].squeeze(0)  # (300, 4)  cxcywh
    labels = outputs[1].squeeze(0)  # (300, num_classes) logits

    # Squeeze to 1D if single-class, else take max confidence across classes
    if labels.ndim == 2 and labels.shape[-1] == 1:
        labels = labels.squeeze(-1)
    elif labels.ndim == 2:
        labels = labels.max(axis=-1)
    confidences = sigmoid(labels)
    keep = confidences >= conf

    results = []
    for i in np.where(keep)[0]:
        cx, cy, w, h = dets[i]

        # RF-DETR outputs are normalized [0, 1] relative to input size
        cx *= 576
        cy *= 576
        w *= 576
        h *= 576

        x1 = cx - w / 2
        y1 = cy - h / 2
        x2 = cx + w / 2
        y2 = cy + h / 2

        # Scale back to original image dimensions
        x1 = x1 * w_orig / 576
        y1 = y1 * h_orig / 576
        x2 = x2 * w_orig / 576
        y2 = y2 * h_orig / 576

        # Clamp to image bounds
        x1 = max(0, min(x1, w_orig))
        y1 = max(0, min(y1, h_orig))
        x2 = max(0, min(x2, w_orig))
        y2 = max(0, min(y2, h_orig))

        results.append((int(x1), int(y1), int(x2), int(y2), float(confidences[i])))

    return results


def run_species(crop: np.ndarray, session: ort.InferenceSession, metadata: dict):
    """Run species classification on a single crop and return structured results."""
    img_size = metadata["input"]["preprocessing"]["resize"]
    input_tensor = preprocess_species(crop, img_size)
    input_name = session.get_inputs()[0].name
    outputs = session.run(None, {input_name: input_tensor})
    logits = outputs[0].squeeze(0)  # (24,)

    probs = softmax(logits)
    top_idx = int(np.argmax(probs))
    top_prob = float(probs[top_idx])

    classes = metadata["classes"]
    class_name = classes[str(top_idx)]
    threshold = metadata.get("confidence_threshold", 0.6)

    return {
        "species": class_name,
        "species_display": fmt_class_name(class_name),
        "confidence": round(top_prob, 6),
        "below_threshold": top_prob < threshold,
        "threshold": threshold,
    }


def run_full_pipeline(
    image_path: str,
    detect_model_path: Path,
    species_model_path: Path,
    turbidity_model_path: Path,
    conf: float,
):
    image_path = Path(image_path)
    if not image_path.exists():
        return {
            "error": f"image not found: {image_path}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    # -----------------------------------------------------------------------
    # Load models and metadata
    # -----------------------------------------------------------------------
    detect_session, detect_provider = load_session(detect_model_path)
    with open(detect_model_path.parent / (detect_model_path.stem + "_metadata.json")) as f:
        detect_metadata = json.load(f)

    species_session, species_provider = load_session(species_model_path)
    with open(species_model_path.parent / (species_model_path.stem + "_metadata.json")) as f:
        species_metadata = json.load(f)

    turbidity_session, turbidity_provider = load_session(turbidity_model_path)
    with open(turbidity_model_path.parent / (turbidity_model_path.stem + "_metadata.json")) as f:
        turbidity_metadata = json.load(f)

    # -----------------------------------------------------------------------
    # Open image
    # -----------------------------------------------------------------------
    pil_image = Image.open(image_path).convert("RGB")
    img_array = np.array(pil_image)
    # All downstream preprocessors expect RGB; keep a separate mutable copy.
    img_cv = img_array.copy()

    img_w, img_h = pil_image.size

    # -----------------------------------------------------------------------
    # 1. Turbidity
    # -----------------------------------------------------------------------
    turbidity_result = run_turbidity(img_cv, turbidity_session, turbidity_metadata)

    # -----------------------------------------------------------------------
    # 2. Detection
    # -----------------------------------------------------------------------
    detections_raw = run_detection(img_cv, detect_session, conf)

    # -----------------------------------------------------------------------
    # 3. Per-detection species classification
    # -----------------------------------------------------------------------
    detections = []
    species_counts = {}

    for x1, y1, x2, y2, det_confidence in detections_raw:
        # Ensure crop stays within image bounds
        x1 = max(0, x1)
        y1 = max(0, y1)
        x2 = min(img_w, x2)
        y2 = min(img_h, y2)

        crop = img_array[y1:y2, x1:x2]
        species_result = run_species(crop, species_session, species_metadata)

        detection_entry = {
            "bbox": [x1, y1, x2, y2],
            "bbox_normalized": [
                round(x1 / img_w, 6),
                round(y1 / img_h, 6),
                round(x2 / img_w, 6),
                round(y2 / img_h, 6),
            ],
            "detection_confidence": round(det_confidence, 6),
            **species_result,
        }
        detections.append(detection_entry)

        # Count species (use "unknown" if below threshold)
        count_key = (
            species_result["species"]
            if not species_result["below_threshold"]
            else "unknown"
        )
        species_counts[count_key] = species_counts.get(count_key, 0) + 1

    # -----------------------------------------------------------------------
    # Build result
    # -----------------------------------------------------------------------
    result = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "image": str(image_path.resolve()),
        "image_dimensions": {"width": img_w, "height": img_h},
        "models": {
            "detection": {
                "path": str(detect_model_path),
                "provider": detect_provider,
            },
            "species": {
                "path": str(species_model_path),
                "provider": species_provider,
            },
            "turbidity": {
                "path": str(turbidity_model_path),
                "provider": turbidity_provider,
            },
        },
        "turbidity": turbidity_result,
        "detections": detections,
        "summary": {
            "total_detections": len(detections),
            "species_counts": species_counts,
        },
    }

    return result


def main():
    script_dir = Path(__file__).parent

    default_detect = script_dir / "models" / "fish_detection.onnx"
    default_species = script_dir / "models" / "species_classifier.onnx"
    default_turbidity = script_dir / "models" / "turbidity.onnx"

    parser = argparse.ArgumentParser(
        description="FishAI pipeline inference (ONNX) — JSON output for application integration"
    )
    parser.add_argument("image", help="Path to input image")
    parser.add_argument(
        "--detect-model",
        type=Path,
        default=default_detect,
        help="Path to detection ONNX model",
    )
    parser.add_argument(
        "--species-model",
        type=Path,
        default=default_species,
        help="Path to species classifier ONNX model",
    )
    parser.add_argument(
        "--turbidity-model",
        type=Path,
        default=default_turbidity,
        help="Path to turbidity ONNX model",
    )
    parser.add_argument(
        "--conf", type=float, default=0.35, help="Detection confidence threshold"
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=None,
        help="Write JSON output to file (default: stdout)",
    )
    parser.add_argument(
        "--compact",
        action="store_true",
        help="Output compact JSON (no indentation)",
    )
    args = parser.parse_args()

    try:
        result = run_full_pipeline(
            args.image,
            args.detect_model,
            args.species_model,
            args.turbidity_model,
            args.conf,
        )
    except Exception as e:
        result = {
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "image": str(Path(args.image).resolve()),
        }

    # Serialize JSON
    indent = None if args.compact else 2
    json_str = json.dumps(result, indent=indent, ensure_ascii=False)

    # Output
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(json_str)
        print(f"JSON saved to: {args.output}", file=sys.stderr)
    else:
        print(json_str)


if __name__ == "__main__":
    main()
