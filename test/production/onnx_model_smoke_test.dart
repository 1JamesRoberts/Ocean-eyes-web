import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as image;
import 'package:oceaneyes/integrations/ml/onnx_fish_inference.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test(
    'all three native ONNX models run end to end',
    () async {
      final encoded = await rootBundle.load('assets/images/aquarium_hero.png');
      final frame = image.decodeImage(
        encoded.buffer.asUint8List(
          encoded.offsetInBytes,
          encoded.lengthInBytes,
        ),
      );
      expect(frame, isNotNull);

      final engine = OnnxFishInference();
      try {
        await engine.initialize();
        expect(engine.availability, FishInferenceAvailability.ready);

        final result = await engine.analyze(
          detectionRegion: frame!,
          fullFrame: frame,
          thresholds: const FishInferenceThresholds(
            detectionConfidence: 0.35,
            classificationConfidence: 0,
          ),
        );

        expect(result, isNotNull);
        expect(result!.fishCount, greaterThan(0));
        expect(result.detections, hasLength(result.fishCount));
        expect(
          result.speciesCounts.values.fold<int>(0, (a, b) => a + b),
          result.fishCount,
        );
        expect(result.turbidityFnu.isFinite, isTrue);
        expect(result.clarityScore, inInclusiveRange(1, 10));
        expect(result.meanDetectionConfidence, inInclusiveRange(0, 1));
        for (final detection in result.detections) {
          expect(detection.detectionConfidence, inInclusiveRange(0, 1));
          expect(detection.classificationConfidence, inInclusiveRange(0, 1));
          expect(
            FishInferencePreprocessing.classifierSpecies,
            contains(detection.speciesId),
          );
          expect(detection.box.left, inInclusiveRange(0, 1));
          expect(detection.box.top, inInclusiveRange(0, 1));
          expect(detection.box.right, inInclusiveRange(0, 1));
          expect(detection.box.bottom, inInclusiveRange(0, 1));
        }
      } finally {
        await engine.dispose();
      }
    },
    timeout: const Timeout(Duration(minutes: 2)),
  );

  test('corrupt model assets fail in a controlled, retryable state', () async {
    final engine = OnnxFishInference(assetBundle: _CorruptModelBundle());
    try {
      await expectLater(
        engine.initialize(),
        throwsA(
          isA<FishInferenceException>().having(
            (error) => error.kind,
            'kind',
            FishInferenceFailureKind.modelLoad,
          ),
        ),
      );
      expect(engine.availability, FishInferenceAvailability.failed);
      expect(engine.lastError, isA<FishInferenceException>());
    } finally {
      await engine.dispose();
    }
  });
}

final class _CorruptModelBundle extends CachingAssetBundle {
  @override
  Future<ByteData> load(String key) async =>
      ByteData.sublistView(Uint8List.fromList(const [0x4f, 0x4e, 0x4e, 0x58]));
}
