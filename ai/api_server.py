"""
FishAI FastAPI Backend Server

Serves ONNX inference via REST API with cached model loading.
Endpoints:
  POST /predict    - Accept image upload, return AI predictions
  GET  /health     - Health check + model status
  GET  /species    - List supported species
"""

import io
import sys
from contextlib import asynccontextmanager
from pathlib import Path

import numpy as np
from fastapi import FastAPI, File, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from inference import FishAIPipeline

# ---------------------------------------------------------------------------
# Model paths (relative to this file)
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).parent.resolve()
MODELS_DIR = SCRIPT_DIR / "models"

DETECT_MODEL = MODELS_DIR / "fish_detection.onnx"
SPECIES_MODEL = MODELS_DIR / "species_classifier.onnx"
TURBIDITY_MODEL = MODELS_DIR / "turbidity.onnx"

# ---------------------------------------------------------------------------
# Global pipeline instance (loaded once at startup)
# ---------------------------------------------------------------------------
pipeline: FishAIPipeline | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models once at startup."""
    global pipeline
    print("[FishAI] Loading ONNX models...", file=sys.stderr)
    pipeline = FishAIPipeline(
        detect_model_path=DETECT_MODEL,
        species_model_path=SPECIES_MODEL,
        turbidity_model_path=TURBIDITY_MODEL,
        conf=0.35,
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
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

        result = pipeline.predict(contents)
        pipeline.conf = original_conf

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

        result = pipeline.predict_detection_only(contents, conf)
        pipeline.conf = original_conf

        return result

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "type": type(e).__name__},
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
