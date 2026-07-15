"""Generate the reduced ONNX artifacts served to web browsers."""

from pathlib import Path
import onnx
from onnxconverter_common import float16
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

    # Float16 preserves the reference crop decisions while halving this model.
    species_model = onnx.load(SOURCE / "species_classifier.onnx")
    species_float16 = float16.convert_float_to_float16(
        species_model,
        keep_io_types=True,
    )
    onnx.save(species_float16, OUTPUT / "species_classifier.onnx")


if __name__ == "__main__":
    main()
