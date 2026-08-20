import 'dart:math' as math;
import 'dart:typed_data';

import 'package:image/image.dart' as image;

import 'fish_inference_models.dart';

/// Pure preprocessing and output projection for the deployed three-model graph.
///
/// Keeping this code free of ONNX Runtime makes the numerical contract testable
/// without committing the model binaries.
abstract final class FishInferencePreprocessing {
  static const imageNetMean = <double>[0.485, 0.456, 0.406];
  static const imageNetStandardDeviation = <double>[0.229, 0.224, 0.225];

  static const turbidityInterceptFnu = -60.9;
  static const minimumModelTurbidityFnu = 0.44;
  static const maximumModelTurbidityFnu = 53.42;
  static const turbidityCoefficients = <double>[
    61.34,
    61.57,
    62.48,
    65.53,
    67.76,
    73.91,
    77.63,
    85.64,
    94.0,
    102.85,
    114.32,
  ];

  /// Class order from `species_classifier_metadata.json` in the legacy app.
  static const classifierSpecies = <String>[
    'angelfish',
    'betta',
    'black_skirt_tetra',
    'cardinal_tetra',
    'cherry_barb',
    'clown_loach',
    'corydoras',
    'discus',
    'dwarf_gourami',
    'german_blue_ram',
    'goldfish',
    'guppy',
    'harlequin_rasbora',
    'molly',
    'neon_tetra',
    'oscar',
    'otocinclus',
    'platy',
    'plecostomus',
    'rummy_nose_tetra',
    'siamese_algae_eater',
    'swordtail',
    'tiger_barb',
    'zebra_danio',
  ];

  /// Resizes and writes one image as planar RGB NCHW with ImageNet scaling.
  static Float32List detectorInput(image.Image source, {required int size}) {
    final resized = image.copyResize(source, width: size, height: size);
    return imageNetNchw(resized);
  }

  /// Resizes and writes the clarity frame as planar RGB NCHW with `/255` only.
  static Float32List waterClarityInput(
    image.Image source, {
    required int size,
  }) {
    final resized = image.copyResize(source, width: size, height: size);
    return unitNchw(resized);
  }

  static Float32List imageNetNchw(image.Image source) {
    final plane = source.width * source.height;
    final output = Float32List(3 * plane);
    var index = 0;
    for (var y = 0; y < source.height; y++) {
      for (var x = 0; x < source.width; x++) {
        final pixel = source.getPixel(x, y);
        output[index] =
            (pixel.r / 255 - imageNetMean[0]) / imageNetStandardDeviation[0];
        output[plane + index] =
            (pixel.g / 255 - imageNetMean[1]) / imageNetStandardDeviation[1];
        output[2 * plane + index] =
            (pixel.b / 255 - imageNetMean[2]) / imageNetStandardDeviation[2];
        index++;
      }
    }
    return output;
  }

  static Float32List unitNchw(image.Image source) {
    final plane = source.width * source.height;
    final output = Float32List(3 * plane);
    var index = 0;
    for (var y = 0; y < source.height; y++) {
      for (var x = 0; x < source.width; x++) {
        final pixel = source.getPixel(x, y);
        output[index] = pixel.r / 255;
        output[plane + index] = pixel.g / 255;
        output[2 * plane + index] = pixel.b / 255;
        index++;
      }
    }
    return output;
  }

  /// Creates the classifier's dynamic batch after detector-box cropping.
  ///
  /// Each crop follows Resize(shorter side = [resizeShortSide]) then centered
  /// [outputSize] square crop, followed by ImageNet normalization.
  static Float32List classifierBatch(
    image.Image detectorRegion,
    List<NormalizedFishBox> boxes, {
    required int outputSize,
    required int resizeShortSide,
  }) {
    final plane = outputSize * outputSize;
    final batch = Float32List(boxes.length * 3 * plane);
    for (var index = 0; index < boxes.length; index++) {
      final crop = cropNormalizedBox(detectorRegion, boxes[index]);
      _writeClassifierCrop(
        batch,
        index * 3 * plane,
        crop,
        outputSize: outputSize,
        resizeShortSide: resizeShortSide,
      );
    }
    return batch;
  }

  static image.Image cropNormalizedBox(
    image.Image source,
    NormalizedFishBox box,
  ) {
    final x1 = (box.left * source.width)
        .round()
        .clamp(0, source.width - 1)
        .toInt();
    final y1 = (box.top * source.height)
        .round()
        .clamp(0, source.height - 1)
        .toInt();
    final x2 = (box.right * source.width)
        .round()
        .clamp(1, source.width)
        .toInt();
    final y2 = (box.bottom * source.height)
        .round()
        .clamp(1, source.height)
        .toInt();
    final width = math.max(1, x2 - x1);
    final height = math.max(1, y2 - y1);
    return image.copyCrop(source, x: x1, y: y1, width: width, height: height);
  }

  static void _writeClassifierCrop(
    Float32List batch,
    int base,
    image.Image crop, {
    required int outputSize,
    required int resizeShortSide,
  }) {
    final scale = resizeShortSide / math.min(crop.width, crop.height);
    final resizedWidth = math.max(outputSize, (crop.width * scale).round());
    final resizedHeight = math.max(outputSize, (crop.height * scale).round());
    final resized = image.copyResize(
      crop,
      width: resizedWidth,
      height: resizedHeight,
    );
    final offsetX = ((resizedWidth - outputSize) / 2).round();
    final offsetY = ((resizedHeight - outputSize) / 2).round();
    final centered = image.copyCrop(
      resized,
      x: offsetX,
      y: offsetY,
      width: outputSize,
      height: outputSize,
    );

    final normalized = imageNetNchw(centered);
    batch.setRange(base, base + normalized.length, normalized);
  }

  /// Applies RF-DETR's `sigmoid(max class logit)` threshold. RF-DETR queries do
  /// not use NMS in the deployed graph.
  static List<DetectorCandidate> detectorCandidates({
    required List<Object?> boxes,
    required List<Object?> labelLogits,
    required double threshold,
  }) {
    final candidates = <DetectorCandidate>[];
    final count = math.min(boxes.length, labelLogits.length);
    for (var query = 0; query < count; query++) {
      final logits = _numericRow(labelLogits[query]);
      final box = _numericRow(boxes[query]);
      if (logits.isEmpty || box.length < 4) continue;

      var maximumLogit = double.negativeInfinity;
      for (final value in logits) {
        if (value.isFinite && value > maximumLogit) maximumLogit = value;
      }
      if (!maximumLogit.isFinite) continue;
      final confidence = 1 / (1 + math.exp(-maximumLogit));
      if (confidence < threshold) continue;

      candidates.add(
        DetectorCandidate(
          box: NormalizedFishBox.fromCenter(
            centerX: box[0],
            centerY: box[1],
            width: box[2],
            height: box[3],
          ),
          confidence: confidence,
        ),
      );
    }
    return candidates;
  }

  static ClassifierPrediction argmaxSoftmax(List<Object?> logits) {
    var maximumLogit = double.negativeInfinity;
    var maximumIndex = -1;
    for (var index = 0; index < logits.length; index++) {
      final value = logits[index];
      if (value is! num) continue;
      final numeric = value.toDouble();
      if (numeric.isFinite && numeric > maximumLogit) {
        maximumLogit = numeric;
        maximumIndex = index;
      }
    }
    if (maximumIndex < 0) {
      return const ClassifierPrediction(index: -1, probability: 0);
    }

    var denominator = 0.0;
    for (final value in logits) {
      if (value is num && value.toDouble().isFinite) {
        denominator += math.exp(value.toDouble() - maximumLogit);
      }
    }
    return ClassifierPrediction(
      index: maximumIndex,
      // exp(maximum - maximum) is one.
      probability: denominator > 0 ? 1 / denominator : 0,
    );
  }

  /// Converts the clarity classifier's 11 already-softmaxed probabilities into
  /// the raw FNU regression value used during model training.
  static double turbidityFnu(List<Object?> probabilities) {
    if (probabilities.length < turbidityCoefficients.length) {
      throw ArgumentError.value(
        probabilities.length,
        'probabilities.length',
        'Water clarity output must contain 11 values.',
      );
    }
    var fnu = turbidityInterceptFnu;
    for (var index = 0; index < turbidityCoefficients.length; index++) {
      final value = probabilities[index];
      if (value is! num || !value.toDouble().isFinite) {
        throw ArgumentError.value(
          value,
          'probabilities[$index]',
          'Water clarity probabilities must be finite numbers.',
        );
      }
      fnu += turbidityCoefficients[index] * value.toDouble();
    }
    return fnu;
  }

  /// Maps raw FNU to the deployed 1–10 clarity score and rounds to one decimal.
  static double legacyClarityScore(double turbidityFnu) {
    final clarity =
        10 -
        (turbidityFnu - minimumModelTurbidityFnu) /
            (maximumModelTurbidityFnu - minimumModelTurbidityFnu) *
            9;
    return (clarity.clamp(1.0, 10.0) * 10).round() / 10;
  }

  static List<double> _numericRow(Object? value) {
    if (value is! List) return const [];
    final row = <double>[];
    for (final item in value) {
      if (item is! num) return const [];
      row.add(item.toDouble());
    }
    return row;
  }
}
