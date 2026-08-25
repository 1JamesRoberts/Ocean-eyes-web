import 'dart:async';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as image;
import 'package:oceaneyes/integrations/camera/camera_capture_gateway.dart';
import 'package:oceaneyes/integrations/ml/onnx_fish_inference.dart';
import 'package:oceaneyes/integrations/power/wake_lock_gateway.dart';
import 'package:oceaneyes/models/aquarium_models.dart';
import 'package:oceaneyes/models/customer_error_message.dart';
import 'package:oceaneyes/models/production_data.dart';
import 'package:oceaneyes/models/production_repository.dart';
import 'package:oceaneyes/view_models/oceaneyes_camera_coordinator.dart';
import 'package:oceaneyes/view_models/oceaneyes_wake_lock_coordinator.dart';

void main() {
  test(
    'camera analysis persists reading, heatmap, and clamped inventory',
    () async {
      final harness = _Harness();
      try {
        await harness.coordinator.captureAndAnalyze(measurementOnly: false);

        expect(harness.repository.readings, hasLength(1));
        final reading = harness.repository.readings.single;
        expect(reading.tankId, 'tank-a');
        expect(reading.turbidityFnu, 3.25);
        expect(reading.clarityScore, 9.5);
        expect(reading.fishCount, 3);
        expect(reading.fishCountConfidence, 0.8);
        expect(reading.speciesDetected, const {'neon_tetra': 3});
        expect(reading.frameDimensions?.width, 100);
        expect(reading.frameDimensions?.height, 80);
        expect(reading.detections.single.nx, 0.5);
        expect(reading.detections.single.ny, 0.625);
        expect(harness.repository.detectedUpdates, const {'fish-1': 2});
        expect(harness.host.lastTurbidityResult, '3.3 FNU');
        expect(harness.host.fishDetections, hasLength(1));
        expect(harness.host.fishDetections.single.box.centerX, 0.5);
        expect(harness.host.fishDetections.single.box.centerY, 0.625);
        expect(reading.fishDetections, hasLength(1));
        expect(reading.fishDetections.single.box.width, closeTo(0.2, 0.0001));
        expect(harness.host.productionError, isNull);
      } finally {
        await harness.dispose();
      }
    },
  );

  test('single-flight guard skips a second camera capture', () async {
    final harness = _Harness();
    final gate = Completer<void>();
    harness.gateway.captureGate = gate;
    try {
      final first = harness.coordinator.captureAndAnalyze(
        measurementOnly: false,
      );
      await Future<void>.delayed(Duration.zero);
      await harness.coordinator.captureAndAnalyze(measurementOnly: false);
      expect(harness.gateway.captureCalls, 1);

      gate.complete();
      await first;
      expect(harness.repository.readings, hasLength(1));
    } finally {
      await harness.dispose();
    }
  });

  test(
    'fatal model load stops auto monitoring and manual retry restores it',
    () async {
      final harness = _Harness(autoConnect: true);
      harness.inference.initializationErrors.add(
        const FishInferenceException(
          'missing model asset',
          kind: FishInferenceFailureKind.modelLoad,
        ),
      );
      try {
        harness.coordinator.configureAutomaticInference();
        await harness.wakeLock.flush();
        expect(harness.wakeGateway.enabledValues, const [true]);

        await harness.coordinator.captureAndAnalyze(measurementOnly: false);
        await harness.wakeLock.flush();
        expect(harness.wakeGateway.enabledValues.last, isFalse);
        expect(harness.repository.readings, isEmpty);
        expect(harness.host.productionError, contains('could not load'));

        await harness.coordinator.captureAndAnalyze(measurementOnly: false);
        await harness.wakeLock.flush();
        expect(harness.repository.readings, hasLength(1));
        expect(harness.wakeGateway.enabledValues.last, isTrue);
        expect(harness.host.productionError, isNull);
      } finally {
        await harness.dispose();
      }
    },
  );

  test(
    'inference failure preserves the last successful result and can retry',
    () async {
      final harness = _Harness();
      harness.host.lastTurbidityResult = '1.2 FNU';
      harness.inference.analysisErrors.add(StateError('bad frame tensor'));
      try {
        await harness.coordinator.captureAndAnalyze(measurementOnly: false);
        expect(harness.host.lastTurbidityResult, '1.2 FNU');
        expect(harness.repository.readings, isEmpty);
        expect(harness.host.productionError, contains('could not process'));

        await harness.coordinator.captureAndAnalyze(measurementOnly: false);
        expect(harness.repository.readings, hasLength(1));
        expect(harness.host.lastTurbidityResult, '3.3 FNU');
      } finally {
        await harness.dispose();
      }
    },
  );

  test(
    'persistence failure keeps the analyzed result and reports save failure',
    () async {
      final harness = _Harness();
      harness.repository.writeError = StateError('cloud unavailable');
      try {
        await harness.coordinator.captureAndAnalyze(measurementOnly: false);

        expect(harness.host.lastTurbidityResult, '3.3 FNU');
        expect(harness.host.heatmapCenters, hasLength(1));
        expect(harness.repository.readings, isEmpty);
        expect(harness.host.productionError, contains('could not be saved'));
        expect(harness.host.cameraStage, CameraStage.active);
      } finally {
        await harness.dispose();
      }
    },
  );
}

final class _Harness {
  _Harness({bool autoConnect = false}) {
    host.autoConnect = autoConnect;
    wakeLock = OceanEyesWakeLockCoordinator(
      gateway: wakeGateway,
      onError: (error, stackTrace) => errors.add(error),
    );
    coordinator = OceanEyesCameraCoordinator(
      enabled: true,
      host: host,
      repository: repository,
      gateway: gateway,
      inference: inference,
      wakeLock: wakeLock,
      handoffConfiguration: const CameraHandoffConfiguration.none(),
      handoffDelay: (_) async {},
      isLivePublishing: () => false,
      stopLive: () async {},
      persist: () {},
      onError: (error, [stackTrace]) {
        errors.add(error);
        host.productionError = oceanEyesCustomerErrorMessage(error);
      },
      onChanged: () {},
    );
    coordinator.initialize();
  }

  final host = _FakeCameraHost();
  final repository = _FakeRepository();
  final gateway = _FakeCameraGateway();
  final inference = _FakeInference();
  final wakeGateway = _FakeWakeLockGateway();
  final errors = <Object>[];
  late final OceanEyesWakeLockCoordinator wakeLock;
  late final OceanEyesCameraCoordinator coordinator;

  Future<void> dispose() async {
    await coordinator.dispose();
    await wakeLock.dispose();
  }
}

final class _FakeCameraHost implements OceanEyesCameraHost {
  @override
  bool isDisposed = false;
  @override
  bool tankConnected = true;
  @override
  bool aiEnabled = true;
  @override
  bool autoConnect = false;
  @override
  String? activeTankId = 'tank-a';
  @override
  double? cameraWaterLineY = 0.25;
  @override
  double pollingIntervalMs = 3600000;
  @override
  double detectionConfidenceThreshold = 0.35;
  @override
  double speciesConfidenceThreshold = 0.35;
  @override
  List<FishEntry> fish = const [
    FishEntry(
      id: 'fish-1',
      speciesId: 'neon_tetra',
      name: 'Neon Tetra',
      scientificName: 'Paracheirodon innesi',
      assetPath: 'assets/images/fish/neon_tetra.png',
      count: 2,
      detected: 0,
      compatibility: 'Community',
      careLevel: 'Easy',
    ),
  ];
  @override
  CameraStage cameraStage = CameraStage.active;
  @override
  bool usingFrontCamera = false;
  @override
  String? productionError;
  @override
  String? lastTurbidityResult;
  @override
  Uint8List? latestCameraFrameBytes;
  @override
  List<FishDetection> fishDetections = const [];
  @override
  List<NormalizedDetectionCenter> heatmapCenters = const [];
  @override
  DetectionFrameDimensions heatmapSourceDimensions =
      const DetectionFrameDimensions(width: 0, height: 0);
}

final class _FakeCameraGateway implements CameraCaptureGateway {
  final _states = StreamController<CameraCaptureSnapshot>.broadcast(sync: true);
  CameraCaptureSnapshot _snapshot = const CameraCaptureSnapshot(
    phase: CameraCapturePhase.ready,
    permission: CameraPermissionState.granted,
  );
  Completer<void>? captureGate;
  int captureCalls = 0;

  @override
  bool get isSupported => true;
  @override
  CameraCaptureSnapshot get snapshot => _snapshot;
  @override
  Stream<CameraCaptureSnapshot> get states => _states.stream;

  @override
  Future<CapturedCameraFrame?> capture({double? normalizedWaterLineY}) async {
    captureCalls += 1;
    await captureGate?.future;
    final full = image.Image(width: 100, height: 80);
    return CapturedCameraFrame(
      encodedBytes: Uint8List.fromList(const [1, 2, 3]),
      fullFrame: full,
      waterRegion: image.copyCrop(full, x: 0, y: 20, width: 100, height: 60),
      waterRegionTopPixels: 20,
      waterRegionTopNormalized: 0.25,
      capturedAt: DateTime.utc(2026, 8, 25),
    );
  }

  @override
  Future<CameraCaptureSnapshot> initialize({
    bool requestPermission = true,
  }) async => _snapshot;
  @override
  Future<CameraCaptureSnapshot> resume() async => _snapshot;
  @override
  Future<CameraCaptureSnapshot> setZoom(double zoom) async => _snapshot;
  @override
  Future<CameraCaptureSnapshot> switchLens() async => _snapshot;
  @override
  Future<void> suspend() async {}
  @override
  Future<void> dispose() async {
    _snapshot = _snapshot.copyWith(phase: CameraCapturePhase.disposed);
    await _states.close();
  }
}

final class _FakeInference implements FishInferenceEngine {
  final initializationErrors = <Object>[];
  final analysisErrors = <Object>[];
  FishInferenceAvailability _availability =
      FishInferenceAvailability.uninitialized;
  Object? _lastError;

  @override
  FishInferenceAvailability get availability => _availability;
  @override
  bool get isBusy => false;
  @override
  bool get isSupported => true;
  @override
  Object? get lastError => _lastError;

  @override
  Future<void> initialize() async {
    if (initializationErrors.isNotEmpty) {
      _lastError = initializationErrors.removeAt(0);
      _availability = FishInferenceAvailability.failed;
      throw _lastError!;
    }
    _lastError = null;
    _availability = FishInferenceAvailability.ready;
  }

  @override
  Future<FishInferenceResult?> analyze({
    required image.Image detectionRegion,
    required image.Image fullFrame,
    NormalizedImageRegion detectionRegionInFullFrame =
        NormalizedImageRegion.full,
    FishInferenceThresholds? thresholds,
  }) async {
    if (analysisErrors.isNotEmpty) throw analysisErrors.removeAt(0);
    return FishInferenceResult(
      fishCount: 3,
      meanDetectionConfidence: 0.8,
      speciesCounts: const {'neon_tetra': 3},
      turbidityFnu: 3.25,
      clarityScore: 9.5,
      detections: [
        FishDetection(
          box: NormalizedFishBox.fromCenter(
            centerX: 0.5,
            centerY: 0.625,
            width: 0.2,
            height: 0.2,
          ),
          detectionConfidence: 0.8,
          speciesId: 'neon_tetra',
          classificationConfidence: 0.9,
        ),
      ],
    );
  }

  @override
  Future<void> dispose() async {
    _availability = FishInferenceAvailability.disposed;
  }
}

final class _FakeRepository implements ProductionOceanEyesRepository {
  final readings = <ProductionReadingDraft>[];
  final detectedUpdates = <String, int>{};
  Object? writeError;

  @override
  String? get currentUserId => 'user-1';

  @override
  Future<void> writeReading(ProductionReadingDraft reading) async {
    if (writeError case final error?) throw error;
    readings.add(reading);
  }

  @override
  Future<void> updateDetectedFish(String fishId, int detected) async {
    detectedUpdates[fishId] = detected;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

final class _FakeWakeLockGateway implements WakeLockGateway {
  final enabledValues = <bool>[];

  @override
  Future<void> setEnabled(bool enabled) async => enabledValues.add(enabled);
  @override
  Future<void> dispose() async {}
}
