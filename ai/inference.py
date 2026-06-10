"""
FishAI Core Inference Module

Extracted reusable inference pipeline from run_pipeline_onnx_json.py.
Load models once and reuse across predictions.
"""

import io
import json
import sys
import os
import base64
import random
import urllib.request
import urllib.error
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
        "confidence": round(top_prob, 4),
        "below_threshold": top_prob < threshold,
    }


def diagnose_fish_image_openai(crop_bytes: bytes) -> dict:
    """
    Sends the cropped fish image to an OpenAI-compatible API for disease diagnosis.
    Configured via LLM_API_URL, LLM_MODEL, and LLM_API_KEY environment variables.
    """
    api_url = os.getenv("LLM_API_URL")
    model = os.getenv("LLM_MODEL")
    api_key = os.getenv("LLM_API_KEY")

    if not api_url:
        return {"error": "LLM endpoint not configured"}

    # Base64 encode the crop image
    b64_image = base64.b64encode(crop_bytes).decode('utf-8')
    
    # Construct OpenAI-compatible Chat Completions payload
    payload = {
        "model": model,
        "temperature": 0.1,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are an aquatic veterinarian. Diagnose fish diseases from cropped images.\n\n"
                    "RULES:\n"
                    "- Always attempt a best-effort diagnosis from whatever visual details are visible, even if the image is blurry, dark, obstructed, or low-resolution. Do NOT refuse to diagnose due to image quality.\n"
                    "- If truly no features are discernible → healthy=true, disease=null, confidence=0.0, description='No visible features discernible in this crop.'\n"
                    "- If uncertain → healthy=false, disease='suspicious', confidence 0.3-0.6\n"
                    "- Never give specific doses or concentrations\n"
                    "- Return ONLY valid JSON, no markdown, no code fences"
                )
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            "Analyze this cropped image of a fish from an aquarium monitoring system. "
                            "Examine it for any visible signs of diseases (e.g., Ich/white spot, fin rot, "
                            "dropsy, velvet, skin lesions, ulcers, cloudy eyes, bloating). "
                            "Return a JSON object with the following schema:\n"
                            "{\n"
                            "  \"healthy\": boolean,\n"
                            "  \"disease\": string or null,\n"
                            "  \"confidence\": float (0.0-1.0),\n"
                            "  \"description\": string (your clinical observations, physical abnormalities, colors, etc.),\n"
                            "  \"treatment\": string (recommended remedies/actions, temperature changes, quarantine, or chemical treatments)\n"
                            "}"
                        )
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{b64_image}"
                        }
                    }
                ]
            }
        ],
    }

    headers = {
        "Content-Type": "application/json"
    }
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    req = urllib.request.Request(
        api_url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            res_body = response.read().decode("utf-8")
            res_json = json.loads(res_body)
            text_response = res_json['choices'][0]['message']['content'].strip()
            
            # Sanitize markdown formatting codeblocks if returned by models ignoring JSON response_format
            if text_response.startswith("```json"):
                text_response = text_response.split("```json", 1)[1]
                if text_response.endswith("```"):
                    text_response = text_response.rsplit("```", 1)[0]
            elif text_response.startswith("```"):
                text_response = text_response.split("```", 1)[1]
                if text_response.endswith("```"):
                    text_response = text_response.rsplit("```", 1)[0]
            text_response = text_response.strip()

            return json.loads(text_response)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            err_json = json.loads(err_body)
            err_msg = err_json.get("error", {}).get("message", err_body)
        except Exception:
            err_msg = err_body
        return {"error": f"LLM API HTTP Error {e.code}: {err_msg}"}
    except Exception as e:
        return {"error": f"Failed to call LLM API: {str(e)}"}


class FishAIPipeline:
    """Cached ONNX inference pipeline. Load once, predict many times."""

    def __init__(
        self,
        detect_model_path: Path,
        species_model_path: Path,
        turbidity_model_path: Path,
        conf: float = 0.35,
        crops_dir: Path | None = None,
    ):
        self.conf = conf
        self.crops_dir = crops_dir
        if self.crops_dir is not None:
            self.crops_dir.mkdir(parents=True, exist_ok=True)

        self.detect_session, self.detect_provider = load_session(detect_model_path)
        with open(detect_model_path.parent / (detect_model_path.stem + "_metadata.json")) as f:
            self.detect_metadata = json.load(f)

        self.species_session, self.species_provider = load_session(species_model_path)
        with open(species_model_path.parent / (species_model_path.stem + "_metadata.json")) as f:
            self.species_metadata = json.load(f)

        self.turbidity_session, self.turbidity_provider = load_session(turbidity_model_path)
        with open(turbidity_model_path.parent / (turbidity_model_path.stem + "_metadata.json")) as f:
            self.turbidity_metadata = json.load(f)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _load_image(image_bytes: bytes) -> tuple[np.ndarray, np.ndarray, int, int]:
        """Load image bytes into RGB array and BGR cv2 format. Returns (img_array, img_cv, width, height)."""
        pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_array = np.array(pil_image)
        img_cv = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
        img_cv = cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB)
        return img_array, img_cv, pil_image.size[0], pil_image.size[1]

    @staticmethod
    def _select_diagnosis_candidate(detections_raw: list, img_w: int, img_h: int) -> int:
        """Choose a random detection whose padded crop is large enough for diagnosis. Returns -1 if none viable."""
        viable = []
        for i, (x1, y1, x2, y2, _) in enumerate(detections_raw):
            pad_w = int((x2 - x1) * 0.15)
            pad_h = int((y2 - y1) * 0.15)
            pw = min(img_w, x2 + pad_w) - max(0, x1 - pad_w)
            ph = min(img_h, y2 + pad_h) - max(0, y1 - pad_h)
            if pw >= 32 and ph >= 32:
                viable.append(i)
        return random.choice(viable) if viable else -1

    def _run_diagnosis(
        self,
        img_array: np.ndarray,
        img_w: int,
        img_h: int,
        x1: int, y1: int, x2: int, y2: int,
        species_result: dict,
        i: int,
    ) -> dict | None:
        """Run disease diagnosis on a padded crop. Returns diagnosis dict or error dict."""
        try:
            w = x2 - x1
            h = y2 - y1
            pad_w = int(w * 0.15)
            pad_h = int(h * 0.15)

            x1_pad = max(0, x1 - pad_w)
            y1_pad = max(0, y1 - pad_h)
            x2_pad = min(img_w, x2 + pad_w)
            y2_pad = min(img_h, y2 + pad_h)

            diag_crop = img_array[y1_pad:y2_pad, x1_pad:x2_pad]
            crop_bgr = cv2.cvtColor(diag_crop, cv2.COLOR_RGB2BGR)
            _, encoded_img = cv2.imencode(".jpg", crop_bgr)
            crop_bytes = encoded_img.tobytes()
            diagnosis_result = diagnose_fish_image_openai(crop_bytes)

            # Save the crop image to disk for later viewing in the UI
            if self.crops_dir is not None and diagnosis_result is not None:
                try:
                    ts_safe = (
                        datetime.now(timezone.utc)
                        .strftime("%Y%m%d_%H%M%S_%f")[:-3]
                    )
                    species_slug = species_result["species"]
                    crop_filename = f"{ts_safe}_{species_slug}_{i}.jpg"
                    crop_path = self.crops_dir / crop_filename
                    with open(crop_path, "wb") as f:
                        f.write(crop_bytes)
                    if isinstance(diagnosis_result, dict):
                        diagnosis_result["crop_url"] = f"/crops/{crop_filename}"
                except Exception as save_err:
                    print(
                        f"[FishAI] Warning: failed to save crop: {save_err}",
                        file=sys.stderr,
                    )
            return diagnosis_result
        except Exception as e:
            return {"error": f"Failed to slice or encode crop: {str(e)}"}

    def predict(self, image_bytes: bytes, diagnose: bool = False) -> dict:
        """Run full pipeline on image bytes and return structured JSON."""
        img_array, img_cv, img_w, img_h = self._load_image(image_bytes)

        turbidity_result = run_turbidity(img_cv, self.turbidity_session, self.turbidity_metadata)
        detections_raw = run_detection(img_cv, self.detect_session, self.conf)

        detections = []
        species_counts = {}

        diagnose_index = self._select_diagnosis_candidate(detections_raw, img_w, img_h) if diagnose else -1

        for i, (x1, y1, x2, y2, det_confidence) in enumerate(detections_raw):
            x1 = max(0, x1)
            y1 = max(0, y1)
            x2 = min(img_w, x2)
            y2 = min(img_h, y2)

            crop = img_array[y1:y2, x1:x2]
            species_result = run_species(crop, self.species_session, self.species_metadata)

            diagnosis_result = self._run_diagnosis(img_array, img_w, img_h, x1, y1, x2, y2, species_result, i) if i == diagnose_index else None

            detection_entry = {
                "bbox": [x1, y1, x2, y2],
                "bbox_normalized": [
                    round(x1 / img_w, 4),
                    round(y1 / img_h, 4),
                    round(x2 / img_w, 4),
                    round(y2 / img_h, 4),
                ],
                "detection_confidence": round(det_confidence, 4),
                "diagnosis": diagnosis_result,
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

    def predict_turbidity_only(self, image_bytes: bytes) -> dict:
        """Run only turbidity estimation on image bytes."""
        _, img_cv, img_w, img_h = self._load_image(image_bytes)

        turbidity_result = run_turbidity(img_cv, self.turbidity_session, self.turbidity_metadata)

        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "models": {
                "turbidity": {"provider": self.turbidity_provider},
            },
            "turbidity": turbidity_result,
        }

    def predict_detection_only(self, image_bytes: bytes, conf: float = 0.35, diagnose: bool = False) -> dict:
        """Run only fish detection + species classification (no turbidity)."""
        img_array, img_cv, img_w, img_h = self._load_image(image_bytes)

        detections_raw = run_detection(img_cv, self.detect_session, conf)

        detections = []
        species_counts = {}

        diagnose_index = self._select_diagnosis_candidate(detections_raw, img_w, img_h) if diagnose else -1

        for i, (x1, y1, x2, y2, det_confidence) in enumerate(detections_raw):
            x1 = max(0, x1)
            y1 = max(0, y1)
            x2 = min(img_w, x2)
            y2 = min(img_h, y2)

            crop = img_array[y1:y2, x1:x2]
            species_result = run_species(crop, self.species_session, self.species_metadata)

            diagnosis_result = self._run_diagnosis(img_array, img_w, img_h, x1, y1, x2, y2, species_result, i) if i == diagnose_index else None

            detection_entry = {
                "bbox": [x1, y1, x2, y2],
                "bbox_normalized": [
                    round(x1 / img_w, 4),
                    round(y1 / img_h, 4),
                    round(x2 / img_w, 4),
                    round(y2 / img_h, 4),
                ],
                "detection_confidence": round(det_confidence, 4),
                "diagnosis": diagnosis_result,
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
