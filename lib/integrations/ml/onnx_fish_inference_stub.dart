import 'package:image/image.dart' as image;

import 'fish_inference_models.dart';

/// Web/unsupported-platform implementation selected by conditional export.
final class OnnxFishInference implements FishInferenceEngine {
  OnnxFishInference({
    this.configuration = const FishInferenceConfiguration(),
    void Function(String message)? log,
  });

  final FishInferenceConfiguration configuration;

  FishInferenceAvailability _availability =
      FishInferenceAvailability.unsupported;

  @override
  FishInferenceAvailability get availability => _availability;

  @override
  bool get isBusy => false;

  @override
  bool get isSupported => false;

  @override
  Object? get lastError =>
      UnsupportedError('ONNX fish inference is unavailable on this platform.');

  @override
  Future<void> initialize() async {
    _availability = FishInferenceAvailability.unsupported;
  }

  @override
  Future<FishInferenceResult?> analyze({
    required image.Image detectionRegion,
    required image.Image fullFrame,
    NormalizedImageRegion detectionRegionInFullFrame =
        NormalizedImageRegion.full,
    FishInferenceThresholds? thresholds,
  }) {
    throw UnsupportedError(
      'ONNX fish inference is unavailable on this platform.',
    );
  }

  @override
  Future<void> dispose() async {
    _availability = FishInferenceAvailability.disposed;
  }
}
