"""
FishAI Core Inference Module

Extracted reusable inference pipeline from run_pipeline_onnx_json.py.
Load models once and reuse across predictions.
"""

import io
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
    raise ImportError("onnxruntime not installed. Install with: pip install onnxruntime")

# Suppress noisy provider-bridge logs (only FATAL messages)
ort.set_default_logger_severity(4)

# ImageNet normalization constants
NORM_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
NORM_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

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

    opts = ort.SessionOptions()
    opts.log_severity_level = 4
    session = ort.InferenceSession(
        str(model_path), sess_options=opts, providers=["CPUExecutionProvider"]
    )
    return session, "CPUExecutionProvider"


def preprocess_detection(image: np.ndarray) -> np.ndarray:
    """Resize to 576x576 and apply ImageNet normalization."""
    img = cv2.resize(image, (576, 576))
    img = img.astype(np.float32) / 255.0
    img = (img - NORM_MEAN) / NORM_STD
    img = np.transpose(img, (2, 0, 1))
    return np.expand_dims(img, axis=0)


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
    """Resize and scale to [0, 1]."""
    img = cv2.resize(image, (img_size, img_size))
    img = img.astype(np.float32) / 255.0
    img = np.transpose(img, (2, 0, 1))
    return np.expand_dims(img, axis=0)


def softmax(x: np.ndarray) -> np.ndarray:
    e_x = np.exp(x - np.max(x, axis=-1, keepdims=True))
    return e_x / np.sum(e_x, axis=-1, keepdims=True)


def sigmoid(x: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-x))


def fmt_class_name(name: str) -> str:
    return name.replace("_", " ").title()


def run_turbidity(image: np.ndarray, session: ort.InferenceSession, metadata: dict):
    imgsz = metadata["input"]["preprocessing"]["resize"]
    input_tensor = preprocess_turbidity(image, imgsz)
    input_name = session.get_inputs()[0].name
    outputs = session.run(None, {input_name: input_tensor})
    probs = outputs[0].squeeze(0)

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
    h_orig, w_orig = image.shape[:2]
    input_tensor = preprocess_detection(image)
    input_name = session.get_inputs()[0].name
    outputs = session.run(None, {input_name: input_tensor})

    dets = outputs[0].squeeze(0)
    labels = outputs[1].squeeze(0)

    if labels.ndim == 2 and labels.shape[-1] == 1:
        labels = labels.squeeze(-1)
    elif labels.ndim == 2:
        labels = labels.max(axis=-1)
    confidences = sigmoid(labels)
    keep = confidences >= conf

    results = []
    for i in np.where(keep)[0]:
        cx, cy, w, h = dets[i]
        cx *= 576
        cy *= 576
        w *= 576
        h *= 576

        x1 = cx - w / 2
        y1 = cy - h / 2
        x2 = cx + w / 2
        y2 = cy + h / 2

        x1 = x1 * w_orig / 576
        y1 = y1 * h_orig / 576
        x2 = x2 * w_orig / 576
        y2 = y2 * h_orig / 576

        x1 = max(0, min(x1, w_orig))
        y1 = max(0, min(y1, h_orig))
        x2 = max(0, min(x2, w_orig))
        y2 = max(0, min(y2, h_orig))

        results.append((int(x1), int(y1), int(x2), int(y2), float(confidences[i])))

    return results


def run_species(crop: np.ndarray, session: ort.InferenceSession, metadata: dict):
    img_size = metadata["input"]["preprocessing"]["resize"]
    input_tensor = preprocess_species(crop, img_size)
    input_name = session.get_inputs()[0].name
    outputs = session.run(None, {input_name: input_tensor})
    logits = outputs[0].squeeze(0)

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


class FishAIPipeline:
    """Cached ONNX inference pipeline. Load once, predict many times."""

    def __init__(
        self,
        detect_model_path: Path,
        species_model_path: Path,
        turbidity_model_path: Path,
        conf: float = 0.35,
    ):
        self.conf = conf

        self.detect_session, self.detect_provider = load_session(detect_model_path)
        with open(detect_model_path.parent / (detect_model_path.stem + "_metadata.json")) as f:
            self.detect_metadata = json.load(f)

        self.species_session, self.species_provider = load_session(species_model_path)
        with open(species_model_path.parent / (species_model_path.stem + "_metadata.json")) as f:
            self.species_metadata = json.load(f)

        self.turbidity_session, self.turbidity_provider = load_session(turbidity_model_path)
        with open(turbidity_model_path.parent / (turbidity_model_path.stem + "_metadata.json")) as f:
            self.turbidity_metadata = json.load(f)

    def predict(self, image_bytes: bytes) -> dict:
        """Run full pipeline on image bytes and return structured JSON."""
        pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_array = np.array(pil_image)
        img_cv = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
        img_cv = cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB)
        img_w, img_h = pil_image.size

        turbidity_result = run_turbidity(img_cv, self.turbidity_session, self.turbidity_metadata)
        detections_raw = run_detection(img_cv, self.detect_session, self.conf)

        detections = []
        species_counts = {}

        for x1, y1, x2, y2, det_confidence in detections_raw:
            x1 = max(0, x1)
            y1 = max(0, y1)
            x2 = min(img_w, x2)
            y2 = min(img_h, y2)

            crop = img_array[y1:y2, x1:x2]
            species_result = run_species(crop, self.species_session, self.species_metadata)

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

            count_key = (
                species_result["species"]
                if not species_result["below_threshold"]
                else "unknown"
            )
            species_counts[count_key] = species_counts.get(count_key, 0) + 1

        result = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "image_dimensions": {"width": img_w, "height": img_h},
            "models": {
                "detection": {"provider": self.detect_provider},
                "species": {"provider": self.species_provider},
                "turbidity": {"provider": self.turbidity_provider},
            },
            "turbidity": turbidity_result,
            "detections": detections,
            "summary": {
                "total_detections": len(detections),
                "species_counts": species_counts,
            },
        }

        return result

    def predict_turbidity_only(self, image_bytes: bytes) -> dict:
        """Run only turbidity estimation on image bytes."""
        pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_array = np.array(pil_image)
        img_cv = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
        img_cv = cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB)
        img_w, img_h = pil_image.size

        turbidity_result = run_turbidity(img_cv, self.turbidity_session, self.turbidity_metadata)

        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "image_dimensions": {"width": img_w, "height": img_h},
            "models": {
                "turbidity": {"provider": self.turbidity_provider},
            },
            "turbidity": turbidity_result,
        }

    def predict_detection_only(self, image_bytes: bytes, conf: float = 0.35) -> dict:
        """Run only fish detection + species classification (no turbidity)."""
        pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_array = np.array(pil_image)
        img_cv = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
        img_cv = cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB)
        img_w, img_h = pil_image.size

        detections_raw = run_detection(img_cv, self.detect_session, conf)

        detections = []
        species_counts = {}

        for x1, y1, x2, y2, det_confidence in detections_raw:
            x1 = max(0, x1)
            y1 = max(0, y1)
            x2 = min(img_w, x2)
            y2 = min(img_h, y2)

            crop = img_array[y1:y2, x1:x2]
            species_result = run_species(crop, self.species_session, self.species_metadata)

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

            count_key = (
                species_result["species"]
                if not species_result["below_threshold"]
                else "unknown"
            )
            species_counts[count_key] = species_counts.get(count_key, 0) + 1

        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "image_dimensions": {"width": img_w, "height": img_h},
            "models": {
                "detection": {"provider": self.detect_provider},
                "species": {"provider": self.species_provider},
            },
            "detections": detections,
            "summary": {
                "total_detections": len(detections),
                "species_counts": species_counts,
            },
        }
