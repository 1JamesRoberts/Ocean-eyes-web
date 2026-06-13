#!/usr/bin/env python3
"""
Backfill missing `image_dimensions` into legacy detection JSONL records.

Legacy records contain `bbox` (pixel) and `bbox_normalized` (0-1) for each
detection. We can recover the original image width/height from these pairs:
    width  = bbox[2] / bbox_normalized[2]
    height = bbox[3] / bbox_normalized[3]

The script computes the median width and height across all detections in a
record to smooth out rounding noise, then writes the enriched records back to
the original files while keeping `.bak` backups.

Usage:
    python ai/scripts/backfill_image_dimensions.py --dry-run
    python ai/scripts/backfill_image_dimensions.py
"""

import argparse
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from statistics import median
from typing import Any


def derive_image_dimensions(record: dict) -> dict[str, int] | None:
    """Derive image dimensions from a detection record's bbox pairs."""
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


def process_file(file_path: Path, dry_run: bool) -> tuple[int, int, int]:
    """Process one JSONL file. Returns (total, enriched, skipped)."""
    records: list[dict[str, Any]] = []
    enriched = 0
    skipped = 0
    total = 0

    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                records.append(line)  # preserve corrupted lines as-is
                continue

            total += 1
            if record.get("image_dimensions"):
                records.append(record)
                continue

            dims = derive_image_dimensions(record)
            if dims:
                record["image_dimensions"] = dims
                enriched += 1
            else:
                skipped += 1
            records.append(record)

    if dry_run or enriched == 0:
        return total, enriched, skipped

    backup_path = file_path.with_suffix(file_path.suffix + ".bak")
    shutil.copy2(file_path, backup_path)

    tmp_path = file_path.with_suffix(file_path.suffix + ".tmp")
    with open(tmp_path, "w", encoding="utf-8") as f:
        for record in records:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

    tmp_path.replace(file_path)
    return total, enriched, skipped


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Backfill image_dimensions into legacy detection JSONL records"
    )
    parser.add_argument(
        "--detections-dir",
        type=Path,
        default=Path(__file__).parent.parent / "output" / "detections",
        help="Directory containing detection JSONL files",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without writing files",
    )
    args = parser.parse_args()

    if not args.detections_dir.exists():
        print(f"Detections directory not found: {args.detections_dir}", file=sys.stderr)
        return 1

    jsonl_files = sorted(args.detections_dir.glob("*.jsonl"))
    if not jsonl_files:
        print("No JSONL files found.")
        return 0

    total_records = 0
    total_enriched = 0
    total_skipped = 0

    for file_path in jsonl_files:
        total, enriched, skipped = process_file(file_path, args.dry_run)
        total_records += total
        total_enriched += enriched
        total_skipped += skipped
        print(
            f"{file_path.name}: {total} records, "
            f"{enriched} enriched, {skipped} skipped"
        )

    action = "Would enrich" if args.dry_run else "Enriched"
    print(
        f"{action} {total_enriched} of {total_records} records "
        f"({total_skipped} skipped due to missing/invalid detections)."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
