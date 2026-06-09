"""
Fish Detection Spatial Heatmap Generator
========================================
Generates a CCTV-style spatial density heatmap from AI detection JSONL data,
overlaid onto the aquarium camera frame.

Usage:
    python data_processing/test.py
"""

import json
import numpy as np
import cv2
import matplotlib.pyplot as plt
from pathlib import Path

# ── Paths ────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).parent.parent
JSONL_PATH = ROOT / "ai" / "output" / "detections" / "2026-06-08.jsonl"
IMAGE_PATH = ROOT / "public" / "mock_camera_main.png"
OUTPUT_PATH = ROOT / "data_processing" / "heatmap_overlay.png"

# ── Parameters ───────────────────────────────────────────────────────────────
HEATMAP_ALPHA = 0.55          # Opacity of the heatmap overlay
COLORMAP = cv2.COLORMAP_JET   # OpenCV colormap (JET = classic CCTV look)
BLUR_SIGMA_PROP = 0.05       # Gaussian blur sigma as proportion of image width


def main() -> None:
    # 1. Load background image -------------------------------------------------
    bg_bgr = cv2.imread(str(IMAGE_PATH))
    if bg_bgr is None:
        raise FileNotFoundError(f"Could not load image: {IMAGE_PATH}")
    bg = cv2.cvtColor(bg_bgr, cv2.COLOR_BGR2RGB)
    h, w = bg.shape[:2]

    # 2. Accumulate detection centres from JSONL -------------------------------
    centres: list[tuple[int, int]] = []
    with open(JSONL_PATH, "r", encoding="utf-8") as f:
        for raw_line in f:
            raw_line = raw_line.strip()
            if not raw_line:
                continue
            frame = json.loads(raw_line)
            for det in frame.get("detections", []):
                # Use normalized bbox so the script works at any image size
                nx1, ny1, nx2, ny2 = det["bbox_normalized"]
                cx = int(((nx1 + nx2) / 2.0) * w)
                cy = int(((ny1 + ny2) / 2.0) * h)
                # Clamp to image bounds
                cx = max(0, min(cx, w - 1))
                cy = max(0, min(cy, h - 1))
                centres.append((cx, cy))

    total_frames = sum(1 for _ in open(JSONL_PATH, "r", encoding="utf-8") if _.strip())
    print(f"Loaded {total_frames} frames, {len(centres)} total detections.")

    if not centres:
        print("No detections found — nothing to plot.")
        return

    # 3. Build density accumulator ---------------------------------------------
    density = np.zeros((h, w), dtype=np.float32)
    for cx, cy in centres:
        density[cy, cx] += 1

    # 4. Gaussian blur for smooth CCTV-style hotspots --------------------------
    sigma = max(1, int(w * BLUR_SIGMA_PROP))
    # OpenCV GaussianBlur kernel size must be odd; derive from sigma
    ksize = int(sigma * 6) | 1
    density = cv2.GaussianBlur(density, (ksize, ksize), sigmaX=sigma)

    # 5. Normalize and apply colormap ------------------------------------------
    max_val = density.max()
    if max_val > 0:
        density_u8 = (density / max_val * 255).astype(np.uint8)
    else:
        density_u8 = np.zeros_like(density, dtype=np.uint8)

    heatmap_bgr = cv2.applyColorMap(density_u8, COLORMAP)
    heatmap = cv2.cvtColor(heatmap_bgr, cv2.COLOR_BGR2RGB)

    # 6. Alpha-blend overlay ---------------------------------------------------
    overlay = cv2.addWeighted(bg, 1.0, heatmap, HEATMAP_ALPHA, 0)

    # 7. Save result -----------------------------------------------------------
    cv2.imwrite(str(OUTPUT_PATH), cv2.cvtColor(overlay, cv2.COLOR_RGB2BGR))
    print(f"Saved heatmap overlay to: {OUTPUT_PATH}")

    # 8. Display interactively -------------------------------------------------
    fig, axes = plt.subplots(1, 3, figsize=(18, 6))

    ax = axes[0]
    ax.imshow(bg)
    ax.set_title("Original Frame")
    ax.axis("off")

    ax = axes[1]
    ax.imshow(heatmap)
    ax.set_title("Heatmap (Standalone)")
    ax.axis("off")

    ax = axes[2]
    im = ax.imshow(overlay)
    ax.set_title("Heatmap Overlay")
    ax.axis("off")
    # Add colorbar
    cbar = fig.colorbar(
        plt.cm.ScalarMappable(cmap="jet", norm=plt.Normalize(vmin=0, vmax=max_val)),
        ax=ax,
        fraction=0.046,
        pad=0.04,
    )
    cbar.set_label("Detection Density (blurred counts)")

    plt.tight_layout()
    plt.show()


if __name__ == "__main__":
    main()
