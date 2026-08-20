import 'dart:math' as math;

import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as image;
import 'package:oceaneyes/integrations/ml/fish_inference_models.dart';
import 'package:oceaneyes/integrations/ml/fish_inference_preprocessing.dart';
import 'package:oceaneyes/models/classifiable_species.dart';

void main() {
  group('three-model preprocessing contract', () {
    test('keeps the exact 24 classifier labels and order', () {
      expect(
        FishInferencePreprocessing.classifierSpecies,
        ClassifiableSpeciesCatalog.speciesClasses,
      );
      expect(FishInferencePreprocessing.classifierSpecies, hasLength(24));
    });

    test('detector uses ImageNet-normalized planar RGB', () {
      final source = image.Image(width: 1, height: 1)
        ..setPixelRgb(0, 0, 255, 0, 128);

      final tensor = FishInferencePreprocessing.detectorInput(source, size: 1);

      expect(tensor, hasLength(3));
      expect(tensor[0], closeTo((1 - 0.485) / 0.229, 0.00001));
      expect(tensor[1], closeTo((0 - 0.456) / 0.224, 0.00001));
      expect(tensor[2], closeTo((128 / 255 - 0.406) / 0.225, 0.00001));
    });

    test('clarity model uses planar RGB divided by 255 only', () {
      final source = image.Image(width: 1, height: 1)
        ..setPixelRgb(0, 0, 255, 64, 128);

      final tensor = FishInferencePreprocessing.waterClarityInput(
        source,
        size: 1,
      );

      expect(tensor[0], 1);
      expect(tensor[1], closeTo(64 / 255, 0.00001));
      expect(tensor[2], closeTo(128 / 255, 0.00001));
    });

    test('classifier builds one NCHW crop per detector box', () {
      final source = image.Image(width: 20, height: 10)
        ..clear(image.ColorRgb8(30, 60, 90));
      final boxes = <NormalizedFishBox>[
        NormalizedFishBox.fromCenter(
          centerX: 0.25,
          centerY: 0.5,
          width: 0.5,
          height: 1,
        ),
        NormalizedFishBox.fromCenter(
          centerX: 0.75,
          centerY: 0.5,
          width: 0.5,
          height: 1,
        ),
      ];

      final batch = FishInferencePreprocessing.classifierBatch(
        source,
        boxes,
        outputSize: 4,
        resizeShortSide: 6,
      );

      expect(batch, hasLength(2 * 3 * 4 * 4));
    });
  });

  group('model output projection', () {
    test('maps turbidity endpoints to raw FNU and legacy clarity', () {
      final clearest = List<Object?>.filled(11, 0)..[0] = 1.0;
      final murkiest = List<Object?>.filled(11, 0)..[10] = 1.0;

      final clearFnu = FishInferencePreprocessing.turbidityFnu(clearest);
      final murkyFnu = FishInferencePreprocessing.turbidityFnu(murkiest);

      expect(clearFnu, closeTo(0.44, 0.000001));
      expect(murkyFnu, closeTo(53.42, 0.000001));
      expect(FishInferencePreprocessing.legacyClarityScore(clearFnu), 10);
      expect(FishInferencePreprocessing.legacyClarityScore(murkyFnu), 1);
    });

    test('uses sigmoid max-logit detector confidence and threshold', () {
      final candidates = FishInferencePreprocessing.detectorCandidates(
        boxes: <Object?>[
          <Object?>[0.5, 0.5, 0.4, 0.2],
          <Object?>[0.2, 0.2, 0.1, 0.1],
        ],
        labelLogits: <Object?>[
          <Object?>[0.0, math.log(3)],
          <Object?>[-2.0, -1.0],
        ],
        threshold: 0.7,
      );

      expect(candidates, hasLength(1));
      expect(candidates.single.confidence, closeTo(0.75, 0.000001));
      expect(candidates.single.box.left, closeTo(0.3, 0.000001));
      expect(candidates.single.box.right, closeTo(0.7, 0.000001));
    });

    test('softmax returns argmax probability', () {
      final prediction = FishInferencePreprocessing.argmaxSoftmax(<Object?>[
        0.0,
        math.log(2),
        math.log(3),
      ]);

      expect(prediction.index, 2);
      expect(prediction.probability, closeTo(0.5, 0.000001));
    });

    test('maps ROI boxes and classified centers into full-frame space', () {
      final region = NormalizedImageRegion.belowWaterLine(0.25);
      final roiBox = NormalizedFishBox.fromCenter(
        centerX: 0.5,
        centerY: 0.5,
        width: 0.2,
        height: 0.4,
      );
      final fullBox = region.mapBox(roiBox);
      final result = FishInferenceResult(
        fishCount: 1,
        meanDetectionConfidence: 0.9,
        speciesCounts: const {'neon_tetra': 1},
        turbidityFnu: 2,
        clarityScore: 9.7,
        detections: [
          FishDetection(
            box: fullBox,
            detectionConfidence: 0.9,
            speciesId: 'neon_tetra',
            classificationConfidence: 0.8,
          ),
        ],
      );

      expect(fullBox.centerX, closeTo(0.5, 0.000001));
      expect(fullBox.centerY, closeTo(0.625, 0.000001));
      expect(result.classifiedCenters.single.nx, closeTo(0.5, 0.000001));
      expect(result.classifiedCenters.single.ny, closeTo(0.625, 0.000001));
      expect(result.classifiedCenters.single.speciesId, 'neon_tetra');
    });
  });
}
