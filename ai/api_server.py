"""
FishAI FastAPI Backend Server

Serves ONNX inference via REST API with cached model loading.
Endpoints:
  POST /predict    - Accept image upload, return AI predictions
  GET  /health     - Health check + model status
  GET  /species    - List supported species
"""

import io
import json
import logging
import sys
import threading
import traceback
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fishai")

import numpy as np
from fastapi import FastAPI, File, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from inference import FishAIPipeline
import os

# Load local environment variables from .env if present
env_file = Path(__file__).parent / ".env"
if env_file.exists():
    with open(env_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                os.environ[k.strip()] = v.strip().strip("'").strip('"')

# ---------------------------------------------------------------------------
# Model paths (relative to this file)
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).parent.resolve()
MODELS_DIR = SCRIPT_DIR / "models"

DETECT_MODEL = MODELS_DIR / "fish_detection.onnx"
SPECIES_MODEL = MODELS_DIR / "species_classifier.onnx"
TURBIDITY_MODEL = MODELS_DIR / "turbidity.onnx"

# ---------------------------------------------------------------------------
# Detection output persistence
# ---------------------------------------------------------------------------
DETECTION_OUTPUT_DIR = SCRIPT_DIR / "output" / "detections"
TURBIDITY_OUTPUT_DIR = SCRIPT_DIR / "output" / "turbidity"
CROP_OUTPUT_DIR = SCRIPT_DIR / "output" / "crops"
_io_lock = threading.Lock()


def append_jsonl(output_dir: Path, result: dict, label: str = "entry") -> None:
    """Append a result dict to today's JSONL file in the given output directory. Best-effort: never raises."""
    try:
        output_dir.mkdir(parents=True, exist_ok=True)
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        file_path = output_dir / f"{today}.jsonl"
        line = json.dumps(result, ensure_ascii=False) + "\n"
        with _io_lock:
            with open(file_path, "a", encoding="utf-8") as f:
                f.write(line)
                f.flush()
    except OSError as e:
        print(f"[FishAI] Warning: failed to write {label} JSONL: {e}", file=sys.stderr)


# ---------------------------------------------------------------------------
# Global pipeline instance (loaded once at startup)
# ---------------------------------------------------------------------------
pipeline: FishAIPipeline | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models once at startup."""
    global pipeline

    # Ensure output directories exist
    CROP_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Mount static file serving for saved crop images
    app.mount("/crops", StaticFiles(directory=str(CROP_OUTPUT_DIR)), name="crops")

    print("[FishAI] Loading ONNX models...", file=sys.stderr)
    pipeline = FishAIPipeline(
        detect_model_path=DETECT_MODEL,
        species_model_path=SPECIES_MODEL,
        turbidity_model_path=TURBIDITY_MODEL,
        conf=0.35,
        crops_dir=CROP_OUTPUT_DIR,
    )
    print(f"[FishAI] Models loaded successfully.", file=sys.stderr)
    print(f"[FishAI] Detection provider: {pipeline.detect_provider}", file=sys.stderr)
    print(f"[FishAI] Species provider: {pipeline.species_provider}", file=sys.stderr)
    print(f"[FishAI] Turbidity provider: {pipeline.turbidity_provider}", file=sys.stderr)
    yield
    print("[FishAI] Shutting down...", file=sys.stderr)


app = FastAPI(
    title="FishAI Inference API",
    description="Real-time fish detection, species classification, and turbidity estimation",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS for local development
_cors_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174"
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _cors_origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Check if API and models are ready."""
    if pipeline is None:
        return JSONResponse(
            status_code=503,
            content={"status": "unavailable", "message": "Models not loaded"},
        )
    return {
        "status": "healthy",
        "models_loaded": True,
        "providers": {
            "detection": pipeline.detect_provider,
            "species": pipeline.species_provider,
            "turbidity": pipeline.turbidity_provider,
        },
    }


@app.get("/species")
async def list_species():
    """Return the list of supported species."""
    if pipeline is None:
        return JSONResponse(status_code=503, content={"error": "Models not loaded"})
    
    classes = pipeline.species_metadata.get("classes", {})
    species_list = [
        {"id": v, "display": v.replace("_", " ").title()}
        for v in classes.values()
    ]
    return {"species": species_list, "count": len(species_list)}


@app.post("/predict")
async def predict(
    file: UploadFile = File(...),
    conf: float = Query(0.35, ge=0.0, le=1.0, description="Detection confidence threshold"),
    diagnose: bool = Query(False, description="Run disease diagnosis on cropped fish"),
    diagnosis_min_conf: float = Query(0.6, ge=0.0, le=1.0, description="Minimum detection confidence to send crop to LLM for diagnosis"),
):
    """
    Run full AI pipeline on uploaded image.
    
    Returns:
        JSON with turbidity, detections, and species summary.
    """
    if pipeline is None:
        return JSONResponse(status_code=503, content={"error": "Models not loaded"})

    try:
        contents = await file.read()
        if not contents:
            return JSONResponse(status_code=400, content={"error": "Empty file"})

        result = pipeline.predict(contents, conf=conf, diagnose=diagnose, diagnosis_min_conf=diagnosis_min_conf)
        append_jsonl(DETECTION_OUTPUT_DIR, result, label="detection")

        # Save turbidity data separately (flattened)
        turbidity_entry = {
            "timestamp": result["timestamp"],
            "model_provider": result.get("models", {}).get("turbidity", {}).get("provider"),
            "image_dimensions": result.get("image_dimensions"),
            **result.get("turbidity", {}),
        }
        append_jsonl(TURBIDITY_OUTPUT_DIR, turbidity_entry, label="turbidity")

        return result

    except (ValueError, OSError) as e:
        logger.warning("Bad request to /predict: %s", e)
        return JSONResponse(status_code=400, content={"error": "Invalid image"})
    except Exception:
        logger.exception("Unexpected error in /predict")
        return JSONResponse(
            status_code=500,
            content={"error": "Prediction failed"},
        )


@app.post("/predict/turbidity")
async def predict_turbidity(
    file: UploadFile = File(...),
):
    """
    Run turbidity estimation only on uploaded image.
    
    Returns:
        JSON with turbidity result only.
    """
    if pipeline is None:
        return JSONResponse(status_code=503, content={"error": "Models not loaded"})

    try:
        contents = await file.read()
        if not contents:
            return JSONResponse(status_code=400, content={"error": "Empty file"})

        result = pipeline.predict_turbidity_only(contents)
        turbidity_entry = {
            "timestamp": result["timestamp"],
            "model_provider": result.get("models", {}).get("turbidity", {}).get("provider"),
            "image_dimensions": result.get("image_dimensions"),
            **result.get("turbidity", {}),
        }
        append_jsonl(TURBIDITY_OUTPUT_DIR, turbidity_entry, label="turbidity")
        return result

    except (ValueError, OSError) as e:
        logger.warning("Bad request to /predict/turbidity: %s", e)
        return JSONResponse(status_code=400, content={"error": "Invalid image"})
    except Exception:
        logger.exception("Unexpected error in /predict/turbidity")
        return JSONResponse(
            status_code=500,
            content={"error": "Prediction failed"},
        )


@app.post("/predict/detection")
async def predict_detection(
    file: UploadFile = File(...),
    conf: float = Query(0.35, ge=0.0, le=1.0, description="Detection confidence threshold"),
    diagnose: bool = Query(False, description="Run disease diagnosis on cropped fish"),
    diagnosis_min_conf: float = Query(0.6, ge=0.0, le=1.0, description="Minimum detection confidence to send crop to LLM for diagnosis"),
):
    """
    Run fish detection + species classification only (no turbidity).

    Returns:
        JSON with detections and species summary only.
    """
    if pipeline is None:
        return JSONResponse(status_code=503, content={"error": "Models not loaded"})

    try:
        contents = await file.read()
        if not contents:
            return JSONResponse(status_code=400, content={"error": "Empty file"})

        result = pipeline.predict_detection_only(contents, conf=conf, diagnose=diagnose, diagnosis_min_conf=diagnosis_min_conf)
        append_jsonl(DETECTION_OUTPUT_DIR, result, label="detection")
        return result

    except (ValueError, OSError) as e:
        logger.warning("Bad request to /predict/detection: %s", e)
        return JSONResponse(status_code=400, content={"error": "Invalid image"})
    except Exception:
        logger.exception("Unexpected error in /predict/detection")
        return JSONResponse(
            status_code=500,
            content={"error": "Prediction failed"},
        )


# ---------------------------------------------------------------------------
# History API — read persisted JSONL inference records
# ---------------------------------------------------------------------------
from typing import List, Any
from statistics import median


def _read_jsonl_date_file(output_dir: Path, date_str: str) -> List[Any]:
    """Read a single day's JSONL file and return a list of parsed objects."""
    file_path = output_dir / f"{date_str}.jsonl"
    if not file_path.exists():
        return []
    results: List[Any] = []
    with _io_lock:
        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    results.append(json.loads(line))
                except json.JSONDecodeError:
                    continue  # skip corrupted lines
    return results


def _derive_image_dimensions(record: dict) -> dict | None:
    """Derive image dimensions from a detection record's bbox + bbox_normalized.

    Returns {"width": int, "height": int} or None if no usable detections.
    """
    detections = record.get("detections", [])
    if not detections:
        return None

    widths: list[float] = []
    heights: list[float] = []
    for det in detections:
        bbox = det.get("bbox")
        bbox_norm = det.get("bbox_normalized")
        if not bbox or not bbox_norm or len(bbox) < 4 or len(bbox_norm) < 4:
            continue
        x2_norm = bbox_norm[2]
        y2_norm = bbox_norm[3]
        if x2_norm <= 0 or y2_norm <= 0:
            continue
        widths.append(bbox[2] / x2_norm)
        heights.append(bbox[3] / y2_norm)

    if not widths or not heights:
        return None

    return {
        "width": int(round(median(widths))),
        "height": int(round(median(heights))),
    }


def _enrich_detection_records(records: List[dict]) -> List[dict]:
    """Add image_dimensions to detection records that lack it."""
    for record in records:
        if not record.get("image_dimensions"):
            derived = _derive_image_dimensions(record)
            if derived:
                record["image_dimensions"] = derived
    return records


def _build_dimension_index(detection_records: List[dict]) -> dict[datetime, dict]:
    """Build a timestamp -> image_dimensions index from detection records."""
    index: dict[datetime, dict] = {}
    for record in detection_records:
        dims = record.get("image_dimensions") or _derive_image_dimensions(record)
        if not dims:
            continue
        ts_str = record.get("timestamp")
        if not ts_str:
            continue
        try:
            ts = datetime.fromisoformat(ts_str)
            index[ts] = dims
        except ValueError:
            continue
    return index


def _enrich_turbidity_records(
    turbidity_records: List[dict], detection_records: List[dict]
) -> List[dict]:
    """Borrow image_dimensions from nearest detection record by timestamp."""
    dimension_index = _build_dimension_index(detection_records)
    if not dimension_index:
        return turbidity_records

    sorted_timestamps = sorted(dimension_index.keys())

    for record in turbidity_records:
        if record.get("image_dimensions"):
            continue
        ts_str = record.get("timestamp")
        if not ts_str:
            continue
        try:
            ts = datetime.fromisoformat(ts_str)
        except ValueError:
            continue

        # Find nearest timestamp in the detection index
        nearest_ts = min(sorted_timestamps, key=lambda t: abs((t - ts).total_seconds()))
        record["image_dimensions"] = dimension_index[nearest_ts]

    return turbidity_records


@app.get("/history/detections")
async def history_detections(
    date: str = Query(default=None, description="YYYY-MM-DD (defaults to today UTC)"),
    limit: int = Query(default=1000, ge=1, le=10000, description="Max records to return"),
):
    """Return parsed detection records for a given date."""
    date_str = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    records = _read_jsonl_date_file(DETECTION_OUTPUT_DIR, date_str)
    records = _enrich_detection_records(records)
    return {"date": date_str, "count": len(records), "records": records[:limit]}


@app.get("/history/turbidity")
async def history_turbidity(
    date: str = Query(default=None, description="YYYY-MM-DD (defaults to today UTC)"),
    limit: int = Query(default=1000, ge=1, le=10000, description="Max records to return"),
):
    """Return parsed turbidity records for a given date."""
    date_str = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    turbidity_records = _read_jsonl_date_file(TURBIDITY_OUTPUT_DIR, date_str)
    detection_records = _read_jsonl_date_file(DETECTION_OUTPUT_DIR, date_str)
    turbidity_records = _enrich_turbidity_records(turbidity_records, detection_records)
    return {"date": date_str, "count": len(turbidity_records), "records": turbidity_records[:limit]}


@app.delete("/history/detections")
async def clear_detection_history(
    date: str = Query(default=None, description="YYYY-MM-DD (defaults to today UTC)"),
):
    """Delete detection history JSONL file for a given date."""
    date_str = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    file_path = DETECTION_OUTPUT_DIR / f"{date_str}.jsonl"
    try:
        if file_path.exists():
            file_path.unlink()
            return {"status": "ok", "deleted": date_str}
        return {"status": "ok", "deleted": date_str, "message": "No file found"}
    except OSError as e:
        return JSONResponse(
            status_code=500, content={"error": f"Failed to delete history: {e}"}
        )


@app.delete("/history/turbidity")
async def clear_turbidity_history(
    date: str = Query(default=None, description="YYYY-MM-DD (defaults to today UTC)"),
):
    """Delete turbidity history JSONL file for a given date."""
    date_str = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    file_path = TURBIDITY_OUTPUT_DIR / f"{date_str}.jsonl"
    try:
        if file_path.exists():
            file_path.unlink()
            return {"status": "ok", "deleted": date_str}
        return {"status": "ok", "deleted": date_str, "message": "No file found"}
    except OSError as e:
        return JSONResponse(
            status_code=500, content={"error": f"Failed to delete history: {e}"}
        )


@app.get("/history/dates")
async def history_dates():
    """List available history dates for which JSONL files exist."""
    def _list_dates(output_dir: Path) -> List[str]:
        if not output_dir.exists():
            return []
        return sorted(
            [p.stem for p in output_dir.glob("*.jsonl") if p.is_file()]
        )

    return {
        "detections": _list_dates(DETECTION_OUTPUT_DIR),
        "turbidity": _list_dates(TURBIDITY_OUTPUT_DIR),
    }


if __name__ == "__main__":
    import uvicorn
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--host", type=str, default="0.0.0.0")
    args = parser.parse_args()
    uvicorn.run(app, host=args.host, port=args.port)
