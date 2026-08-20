import 'package:image/image.dart' as img;

class WaterLineCrop {
  const WaterLineCrop({
    required this.image,
    required this.topPixels,
    required this.topNormalized,
  });

  final img.Image image;
  final int topPixels;
  final double topNormalized;

  bool get isCropped => topPixels > 0;
}

/// Pure water-line crop used by both the camera gateway and model-free tests.
abstract final class WaterLineCropper {
  /// Keeps the area below [normalizedWaterLineY]. Invalid, zero, and endpoint
  /// values preserve the entire image, matching the deployed monitor client.
  static WaterLineCrop belowWaterLine(
    img.Image frame,
    double? normalizedWaterLineY,
  ) {
    final waterLine = normalizedWaterLineY;
    if (waterLine == null ||
        !waterLine.isFinite ||
        waterLine <= 0 ||
        waterLine >= 1 ||
        frame.height <= 1) {
      return WaterLineCrop(image: frame, topPixels: 0, topNormalized: 0);
    }

    final top = (frame.height * waterLine).round().clamp(0, frame.height - 1);
    final height = frame.height - top;
    if (height <= 0) {
      return WaterLineCrop(image: frame, topPixels: 0, topNormalized: 0);
    }

    return WaterLineCrop(
      image: img.copyCrop(
        frame,
        x: 0,
        y: top,
        width: frame.width,
        height: height,
      ),
      topPixels: top,
      // Use the actual rounded crop boundary so detection coordinates map
      // exactly back to the decoded source frame.
      topNormalized: top / frame.height,
    );
  }
}
