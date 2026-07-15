"""Generate the reduced ONNX artifacts served to web browsers."""

from pathlib import Path
from shutil import copy2

from onnxruntime.quantization import QuantType, quantize_dynamic


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "ai" / "models"
OUTPUT = SOURCE / "web"


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)

    for filename in ("fish_detection.onnx", "turbidity.onnx"):
        quantize_dynamic(
            SOURCE / filename,
            OUTPUT / filename,
            weight_type=QuantType.QInt8,
        )

    # Dynamic quantization changed too many species decisions in the reference
    # aquarium frame, so P0 deliberately retains this smaller float32 model.
    copy2(SOURCE / "species_classifier.onnx", OUTPUT / "species_classifier.onnx")


if __name__ == "__main__":
    main()
