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
import sys
import threading
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

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

        # Temporarily update confidence if different from default
        original_conf = pipeline.conf
        pipeline.conf = conf

        result = pipeline.predict(contents, diagnose=diagnose)
        pipeline.conf = original_conf

        append_jsonl(DETECTION_OUTPUT_DIR, result, label="detection")

        # Save turbidity data separately (flattened)
        turbidity_entry = {
            "timestamp": result["timestamp"],
            "model_provider": result.get("models", {}).get("turbidity", {}).get("provider"),
            **result.get("turbidity", {}),
        }
        append_jsonl(TURBIDITY_OUTPUT_DIR, turbidity_entry, label="turbidity")

        return result

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "type": type(e).__name__},
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
            **result.get("turbidity", {}),
        }
        append_jsonl(TURBIDITY_OUTPUT_DIR, turbidity_entry, label="turbidity")
        return result

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "type": type(e).__name__},
        )


@app.post("/predict/detection")
async def predict_detection(
    file: UploadFile = File(...),
    conf: float = Query(0.35, ge=0.0, le=1.0, description="Detection confidence threshold"),
    diagnose: bool = Query(False, description="Run disease diagnosis on cropped fish"),
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

        original_conf = pipeline.conf
        pipeline.conf = conf

        result = pipeline.predict_detection_only(contents, conf, diagnose=diagnose)
        pipeline.conf = original_conf

        append_jsonl(DETECTION_OUTPUT_DIR, result, label="detection")
        return result

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "type": type(e).__name__},
        )


# ---------------------------------------------------------------------------
# History API — read persisted JSONL inference records
# ---------------------------------------------------------------------------
from typing import List, Any


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


@app.get("/history/detections")
async def history_detections(
    date: str = Query(default=None, description="YYYY-MM-DD (defaults to today UTC)"),
    limit: int = Query(default=1000, ge=1, le=10000, description="Max records to return"),
):
    """Return parsed detection records for a given date."""
    if pipeline is None:
        return JSONResponse(status_code=503, content={"error": "Models not loaded"})

    date_str = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    records = _read_jsonl_date_file(DETECTION_OUTPUT_DIR, date_str)
    return {"date": date_str, "count": len(records), "records": records[:limit]}


@app.get("/history/turbidity")
async def history_turbidity(
    date: str = Query(default=None, description="YYYY-MM-DD (defaults to today UTC)"),
    limit: int = Query(default=1000, ge=1, le=10000, description="Max records to return"),
):
    """Return parsed turbidity records for a given date."""
    if pipeline is None:
        return JSONResponse(status_code=503, content={"error": "Models not loaded"})

    date_str = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    records = _read_jsonl_date_file(TURBIDITY_OUTPUT_DIR, date_str)
    return {"date": date_str, "count": len(records), "records": records[:limit]}


@app.delete("/history/detections")
async def clear_detection_history(
    date: str = Query(default=None, description="YYYY-MM-DD (defaults to today UTC)"),
):
    """Delete detection history JSONL file for a given date."""
    if pipeline is None:
        return JSONResponse(status_code=503, content={"error": "Models not loaded"})

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
    if pipeline is None:
        return JSONResponse(status_code=503, content={"error": "Models not loaded"})

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
    if pipeline is None:
        return JSONResponse(status_code=503, content={"error": "Models not loaded"})

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
    uvicorn.run(app, host="0.0.0.0", port=8000)
