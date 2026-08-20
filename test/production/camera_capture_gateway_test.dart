import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as image;
import 'package:oceaneyes/integrations/camera/camera_capture_gateway_stub.dart';
import 'package:oceaneyes/integrations/camera/camera_capture_models.dart';
import 'package:oceaneyes/integrations/camera/camera_operation_queue.dart';
import 'package:oceaneyes/integrations/camera/water_line_cropper.dart';

void main() {
  group('CameraLensOrdering', () {
    test('prefers rear lenses without removing switch targets', () {
      const lenses = <CameraLensFacing>[
        CameraLensFacing.front,
        CameraLensFacing.external,
        CameraLensFacing.back,
        CameraLensFacing.front,
      ];

      final ordered = CameraLensOrdering.preferred(
        lenses,
        preferBackCamera: true,
        isBackCamera: (lens) => lens == CameraLensFacing.back,
      );

      expect(ordered, const [
        CameraLensFacing.back,
        CameraLensFacing.front,
        CameraLensFacing.external,
        CameraLensFacing.front,
      ]);
    });

    test('preserves discovery order when rear preference is disabled', () {
      const lenses = <CameraLensFacing>[
        CameraLensFacing.front,
        CameraLensFacing.back,
      ];

      expect(
        CameraLensOrdering.preferred(
          lenses,
          preferBackCamera: false,
          isBackCamera: (lens) => lens == CameraLensFacing.back,
        ),
        lenses,
      );
    });
  });

  group('WaterLineCropper', () {
    test('keeps only pixels below the calibrated line', () {
      final frame = image.Image(width: 2, height: 4);
      for (var y = 0; y < frame.height; y++) {
        for (var x = 0; x < frame.width; x++) {
          frame.setPixelRgb(x, y, y * 20, 0, 0);
        }
      }

      final crop = WaterLineCropper.belowWaterLine(frame, 0.5);

      expect(crop.topPixels, 2);
      expect(crop.topNormalized, 0.5);
      expect(crop.image.width, 2);
      expect(crop.image.height, 2);
      expect(crop.image.getPixel(0, 0).r, 40);
      expect(crop.image.getPixel(0, 1).r, 60);
    });

    test('reports the actual rounded boundary for coordinate remapping', () {
      final frame = image.Image(width: 2, height: 5);

      final crop = WaterLineCropper.belowWaterLine(frame, 0.3);

      expect(crop.topPixels, 2);
      expect(crop.topNormalized, 0.4);
      expect(crop.image.height, 3);
    });

    test('preserves full frame for missing or invalid calibration', () {
      final frame = image.Image(width: 2, height: 4);

      for (final waterLine in <double?>[null, double.nan, -0.1, 0, 1, 1.1]) {
        final crop = WaterLineCropper.belowWaterLine(frame, waterLine);
        expect(identical(crop.image, frame), isTrue, reason: '$waterLine');
        expect(crop.topPixels, 0);
        expect(crop.topNormalized, 0);
      }
    });
  });

  group('CameraOperationQueue', () {
    test(
      'serializes operations enqueued in the same event-loop turn',
      () async {
        final queue = CameraOperationQueue();
        final firstGate = Completer<void>();
        final events = <String>[];
        var activeOperations = 0;
        var maximumConcurrentOperations = 0;

        final first = queue.run(() async {
          activeOperations += 1;
          maximumConcurrentOperations = activeOperations;
          events.add('first:start');
          await firstGate.future;
          events.add('first:end');
          activeOperations -= 1;
        });
        final second = queue.run(() async {
          activeOperations += 1;
          maximumConcurrentOperations =
              activeOperations > maximumConcurrentOperations
              ? activeOperations
              : maximumConcurrentOperations;
          events.add('second:start');
          activeOperations -= 1;
        });

        expect(queue.isBusy, isTrue);
        await Future<void>.delayed(Duration.zero);
        expect(events, const ['first:start']);

        firstGate.complete();
        await Future.wait([first, second]);

        expect(events, const ['first:start', 'first:end', 'second:start']);
        expect(maximumConcurrentOperations, 1);
        expect(queue.isBusy, isFalse);
      },
    );

    test('continues with the next operation after a failure', () async {
      final queue = CameraOperationQueue();
      final events = <String>[];

      final failed = queue.run<void>(() {
        events.add('failed');
        throw StateError('camera transition failed');
      });
      final recovered = queue.run(() {
        events.add('recovered');
        return 7;
      });

      await expectLater(failed, throwsStateError);
      expect(await recovered, 7);
      await queue.waitUntilIdle();
      expect(events, const ['failed', 'recovered']);
      expect(queue.isBusy, isFalse);
    });
  });

  test(
    'unsupported gateway reports unavailable without plugin calls',
    () async {
      final gateway = ProductionCameraCaptureGateway();

      expect(gateway.isSupported, isFalse);
      final state = await gateway.initialize();

      expect(state.phase, CameraCapturePhase.unavailable);
      expect(state.permission, CameraPermissionState.unsupported);
      expect(await gateway.capture(), isNull);
      await gateway.dispose();
      expect(gateway.snapshot.phase, CameraCapturePhase.disposed);
    },
  );
}
