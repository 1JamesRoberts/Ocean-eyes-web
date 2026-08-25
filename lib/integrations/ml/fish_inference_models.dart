import 'package:image/image.dart' as image;

/// Optional policy for implementations that must explicitly opt into
/// automatic inference.
abstract interface class FishInferenceAutomaticInferencePolicy {
  bool get automaticInferenceEnabled;
}

enum FishInferenceAvailability {
  uninitialized,
  initializing,
  ready,
  unsupported,
  failed,
  disposed,
}

class FishInferenceThresholds {
  const FishInferenceThresholds({
    this.detectionConfidence = 0.3,
    this.classificationConfidence = 0.3,
  }) : assert(
         detectionConfidence >= 0 && detectionConfidence <= 1,
         'detectionConfidence must be between 0 and 1.',
       ),
       assert(
         classificationConfidence >= 0 && classificationConfidence <= 1,
         'classificationConfidence must be between 0 and 1.',
       );

  final double detectionConfidence;
  final double classificationConfidence;
}

class FishInferenceConfiguration {
  const FishInferenceConfiguration({
    this.detectorAsset = 'assets/models/fish_detector.onnx',
    this.classifierAsset = 'assets/models/species_classifier.onnx',
    this.waterClarityAsset = 'assets/models/water_clarity.onnx',
    this.detectorInputSize = 576,
    this.classifierInputSize = 224,
    this.classifierResizeShortSide = 256,
    this.waterClarityInputSize = 224,
    this.maximumClassificationsPerFrame = 64,
    this.thresholds = const FishInferenceThresholds(),
  }) : assert(detectorInputSize > 0),
       assert(classifierInputSize > 0),
       assert(classifierResizeShortSide >= classifierInputSize),
       assert(waterClarityInputSize > 0),
       assert(maximumClassificationsPerFrame > 0);

  final String detectorAsset;
  final String classifierAsset;
  final String waterClarityAsset;
  final int detectorInputSize;
  final int classifierInputSize;
  final int classifierResizeShortSide;
  final int waterClarityInputSize;
  final int maximumClassificationsPerFrame;
  final FishInferenceThresholds thresholds;
}

/// Normalized rectangle locating the detector ROI inside the full frame.
class NormalizedImageRegion {
  const NormalizedImageRegion._({
    required this.left,
    required this.top,
    required this.width,
    required this.height,
  });

  static const full = NormalizedImageRegion._(
    left: 0,
    top: 0,
    width: 1,
    height: 1,
  );

  factory NormalizedImageRegion({
    required double left,
    required double top,
    required double width,
    required double height,
  }) {
    if (!left.isFinite ||
        !top.isFinite ||
        !width.isFinite ||
        !height.isFinite) {
      return full;
    }
    final safeLeft = left.clamp(0.0, 1.0).toDouble();
    final safeTop = top.clamp(0.0, 1.0).toDouble();
    final safeWidth = width.clamp(0.0, 1.0 - safeLeft).toDouble();
    final safeHeight = height.clamp(0.0, 1.0 - safeTop).toDouble();
    if (safeWidth <= 0 || safeHeight <= 0) return full;
    return NormalizedImageRegion._(
      left: safeLeft,
      top: safeTop,
      width: safeWidth,
      height: safeHeight,
    );
  }

  factory NormalizedImageRegion.belowWaterLine(double normalizedTop) {
    if (!normalizedTop.isFinite || normalizedTop <= 0 || normalizedTop >= 1) {
      return full;
    }
    return NormalizedImageRegion(
      left: 0,
      top: normalizedTop,
      width: 1,
      height: 1 - normalizedTop,
    );
  }

  final double left;
  final double top;
  final double width;
  final double height;

  NormalizedFishBox mapBox(NormalizedFishBox box) {
    return NormalizedFishBox.fromEdges(
      left: left + box.left * width,
      top: top + box.top * height,
      right: left + box.right * width,
      bottom: top + box.bottom * height,
    );
  }
}

class NormalizedFishBox {
  const NormalizedFishBox._({
    required this.left,
    required this.top,
    required this.right,
    required this.bottom,
  });

  factory NormalizedFishBox.fromEdges({
    required double left,
    required double top,
    required double right,
    required double bottom,
  }) {
    final safeLeft = _finiteClamp(left);
    final safeTop = _finiteClamp(top);
    final safeRight = _finiteClamp(right);
    final safeBottom = _finiteClamp(bottom);
    return NormalizedFishBox._(
      left: safeLeft <= safeRight ? safeLeft : safeRight,
      top: safeTop <= safeBottom ? safeTop : safeBottom,
      right: safeRight >= safeLeft ? safeRight : safeLeft,
      bottom: safeBottom >= safeTop ? safeBottom : safeTop,
    );
  }

  factory NormalizedFishBox.fromCenter({
    required double centerX,
    required double centerY,
    required double width,
    required double height,
  }) {
    final safeWidth = width.isFinite ? width.abs() : 0.0;
    final safeHeight = height.isFinite ? height.abs() : 0.0;
    return NormalizedFishBox.fromEdges(
      left: centerX - safeWidth / 2,
      top: centerY - safeHeight / 2,
      right: centerX + safeWidth / 2,
      bottom: centerY + safeHeight / 2,
    );
  }

  final double left;
  final double top;
  final double right;
  final double bottom;

  double get width => right - left;
  double get height => bottom - top;
  double get centerX => (left + right) / 2;
  double get centerY => (top + bottom) / 2;
}

class FishDetection {
  const FishDetection({
    required this.box,
    required this.detectionConfidence,
    this.speciesId,
    this.classificationConfidence,
  });

  /// Box coordinates normalized to the full clarity frame, not just the ROI.
  final NormalizedFishBox box;
  final double detectionConfidence;
  final String? speciesId;
  final double? classificationConfidence;

  bool get isClassified => speciesId != null;

  FishDetection classify({
    required String speciesId,
    required double confidence,
  }) {
    return FishDetection(
      box: box,
      detectionConfidence: detectionConfidence,
      speciesId: speciesId,
      classificationConfidence: confidence,
    );
  }
}

class NormalizedInferenceCenter {
  const NormalizedInferenceCenter({
    required this.nx,
    required this.ny,
    required this.speciesId,
  });

  final double nx;
  final double ny;
  final String speciesId;
}

class FishInferenceResult {
  FishInferenceResult({
    required this.fishCount,
    required this.meanDetectionConfidence,
    required Map<String, int> speciesCounts,
    required this.turbidityFnu,
    required this.clarityScore,
    required List<FishDetection> detections,
  }) : speciesCounts = Map<String, int>.unmodifiable(speciesCounts),
       detections = List<FishDetection>.unmodifiable(detections);

  final int fishCount;
  final double meanDetectionConfidence;
  final Map<String, int> speciesCounts;

  /// Direct regression output in Formazin Nephelometric Units.
  final double turbidityFnu;

  /// Compatibility score used by deployed clients: 1 (murky) to 10 (clear).
  final double clarityScore;
  final List<FishDetection> detections;

  double get legacyClarity => clarityScore;

  List<NormalizedInferenceCenter> get classifiedCenters =>
      List<NormalizedInferenceCenter>.unmodifiable(
        detections
            .where((detection) => detection.isClassified)
            .map(
              (detection) => NormalizedInferenceCenter(
                nx: detection.box.centerX,
                ny: detection.box.centerY,
                speciesId: detection.speciesId!,
              ),
            ),
      );
}

class DetectorCandidate {
  const DetectorCandidate({required this.box, required this.confidence});

  /// Box normalized to the detector ROI.
  final NormalizedFishBox box;
  final double confidence;
}

class ClassifierPrediction {
  const ClassifierPrediction({required this.index, required this.probability});

  final int index;
  final double probability;
}

abstract interface class FishInferenceEngine {
  bool get isSupported;
  bool get isBusy;
  FishInferenceAvailability get availability;
  Object? get lastError;

  Future<void> initialize();

  /// Runs the detector on [detectionRegion] and clarity on [fullFrame].
  ///
  /// Returns null when another inference owns the single-flight guard. Boxes in
  /// the result are remapped through [detectionRegionInFullFrame].
  Future<FishInferenceResult?> analyze({
    required image.Image detectionRegion,
    required image.Image fullFrame,
    NormalizedImageRegion detectionRegionInFullFrame =
        NormalizedImageRegion.full,
    FishInferenceThresholds? thresholds,
  });

  Future<void> dispose();
}

enum FishInferenceFailureKind { modelLoad, modelContract, execution }

class FishInferenceException implements Exception {
  const FishInferenceException(
    this.message, {
    this.kind = FishInferenceFailureKind.execution,
    this.cause,
  });

  final String message;
  final FishInferenceFailureKind kind;
  final Object? cause;

  @override
  String toString() => cause == null
      ? 'FishInferenceException: $message'
      : 'FishInferenceException: $message ($cause)';
}

double _finiteClamp(double value) =>
    value.isFinite ? value.clamp(0.0, 1.0).toDouble() : 0;
