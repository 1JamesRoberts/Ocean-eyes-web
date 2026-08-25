import 'dart:async';
import 'dart:convert';
import 'dart:js_interop';

import 'package:flutter/services.dart';
import 'package:image/image.dart' as image;

import 'fish_inference_models.dart';
import 'inference_single_flight.dart';

/// Browser ONNX Runtime implementation backed by a dedicated Web Worker.
///
/// Models and camera pixels are fetched/transferred only within the browser;
/// no inference request is sent to an OceanEyes service.
final class OnnxFishInference
    implements FishInferenceEngine, FishInferenceAutomaticInferencePolicy {
  OnnxFishInference({
    this.configuration = const FishInferenceConfiguration(),
    AssetBundle? assetBundle,
    void Function(String message)? log,
    bool enableAutomaticInference = const bool.fromEnvironment(
      'OCEANEYES_WEB_AUTO_INFERENCE',
      defaultValue: false,
    ),
    this.preferWebGpu = true,
  }) : _log = log,
       _automaticInferenceEnabled = enableAutomaticInference {
    _isSupported = _readCapabilities();
  }

  final FishInferenceConfiguration configuration;
  final bool preferWebGpu;
  final void Function(String message)? _log;
  final bool _automaticInferenceEnabled;
  final InferenceSingleFlight _singleFlight = InferenceSingleFlight();

  late bool _isSupported;
  FishInferenceAvailability _availability =
      FishInferenceAvailability.uninitialized;
  Object? _lastError;
  Future<void>? _initializing;

  @override
  bool get isSupported => _isSupported;

  @override
  bool get isBusy => _singleFlight.isBusy;

  @override
  FishInferenceAvailability get availability => _availability;

  @override
  Object? get lastError => _lastError;

  @override
  bool get automaticInferenceEnabled => _automaticInferenceEnabled;

  @override
  Future<void> initialize() {
    _ensureNotDisposed();
    if (_availability == FishInferenceAvailability.ready) {
      return Future<void>.value();
    }
    final existing = _initializing;
    if (existing != null) return existing;
    late final Future<void> operation;
    operation = _initialize().whenComplete(() {
      if (identical(_initializing, operation)) _initializing = null;
    });
    _initializing = operation;
    return operation;
  }

  Future<void> _initialize() async {
    _isSupported = _readCapabilities();
    if (!isSupported) {
      _availability = FishInferenceAvailability.unsupported;
      _lastError = UnsupportedError(
        'Browser AI needs Web Workers, WebAssembly, and OffscreenCanvas.',
      );
      return;
    }

    _availability = FishInferenceAvailability.initializing;
    _lastError = null;
    try {
      final response = await _initializeWorker(
        jsonEncode(_configurationJson()).toJS,
      ).toDart;
      if (_availability == FishInferenceAvailability.disposed) return;
      final decoded = jsonDecode(response.toDart) as Map<String, dynamic>;
      if (decoded['contractVersion'] != 1) {
        throw const FishInferenceException(
          'Browser worker contract version is incompatible.',
          kind: FishInferenceFailureKind.modelContract,
        );
      }
      _availability = FishInferenceAvailability.ready;
    } catch (error) {
      if (_availability == FishInferenceAvailability.disposed) rethrow;
      final failure = error is FishInferenceException
          ? error
          : FishInferenceException(
              'Could not start ONNX Runtime Web.',
              kind: FishInferenceFailureKind.modelLoad,
              cause: error,
            );
      _availability = FishInferenceAvailability.failed;
      _lastError = failure;
      rethrow;
    }
  }

  @override
  Future<FishInferenceResult?> analyze({
    required image.Image detectionRegion,
    required image.Image fullFrame,
    NormalizedImageRegion detectionRegionInFullFrame =
        NormalizedImageRegion.full,
    FishInferenceThresholds? thresholds,
  }) {
    _ensureNotDisposed();
    if (_availability != FishInferenceAvailability.ready) {
      throw StateError('OnnxFishInference.initialize() must complete first.');
    }
    if (detectionRegion.width <= 0 ||
        detectionRegion.height <= 0 ||
        fullFrame.width <= 0 ||
        fullFrame.height <= 0) {
      throw ArgumentError('Inference images must have positive dimensions.');
    }
    final activeThresholds = thresholds ?? configuration.thresholds;
    _validateThresholds(activeThresholds);
    return _singleFlight.run(
      () => _analyze(
        detectionRegion: detectionRegion,
        fullFrame: fullFrame,
        region: detectionRegionInFullFrame,
        thresholds: activeThresholds,
      ),
    );
  }

  Future<FishInferenceResult> _analyze({
    required image.Image detectionRegion,
    required image.Image fullFrame,
    required NormalizedImageRegion region,
    required FishInferenceThresholds thresholds,
  }) async {
    final timer = Stopwatch()..start();
    try {
      final promise = _analyzeWorker(
        jsonEncode(_configurationJson()).toJS,
        detectionRegion.getBytes(order: image.ChannelOrder.rgba).toJS,
        detectionRegion.width,
        detectionRegion.height,
        fullFrame.getBytes(order: image.ChannelOrder.rgba).toJS,
        fullFrame.width,
        fullFrame.height,
        jsonEncode({
          'left': region.left,
          'top': region.top,
          'width': region.width,
          'height': region.height,
        }).toJS,
        jsonEncode({
          'detectionConfidence': thresholds.detectionConfidence,
          'classificationConfidence': thresholds.classificationConfidence,
        }).toJS,
      );
      final response = await promise.toDart;
      final data = jsonDecode(response.toDart) as Map<String, dynamic>;
      if (data['contractVersion'] != 1) {
        throw const FishInferenceException(
          'Browser inference returned an incompatible result contract.',
          kind: FishInferenceFailureKind.modelContract,
        );
      }
      final result = _decodeResult(data);
      _lastError = null;
      timer.stop();
      _log?.call(
        'ONNX Runtime Web inference completed in '
        '${timer.elapsedMilliseconds} ms using ${data['providers']}.',
      );
      return result;
    } catch (error) {
      final rendered = error.toString();
      final kind = rendered.contains('model-contract:')
          ? FishInferenceFailureKind.modelContract
          : rendered.contains('HTTP') || rendered.contains('model')
          ? FishInferenceFailureKind.modelLoad
          : FishInferenceFailureKind.execution;
      final failure = error is FishInferenceException
          ? error
          : FishInferenceException(
              'ONNX Runtime Web inference failed.',
              kind: kind,
              cause: error,
            );
      _lastError = failure;
      throw failure;
    }
  }

  FishInferenceResult _decodeResult(Map<String, dynamic> data) {
    final rawDetections = data['detections'];
    if (rawDetections is! List) {
      throw const FishInferenceException(
        'Browser detections are missing.',
        kind: FishInferenceFailureKind.modelContract,
      );
    }
    final detections = <FishDetection>[];
    for (final raw in rawDetections) {
      if (raw is! Map) continue;
      final box = raw['box'];
      if (box is! Map) continue;
      final speciesId = raw['speciesId'];
      final classificationConfidence = raw['classificationConfidence'];
      detections.add(
        FishDetection(
          box: NormalizedFishBox.fromEdges(
            left: _number(box['left']),
            top: _number(box['top']),
            right: _number(box['right']),
            bottom: _number(box['bottom']),
          ),
          detectionConfidence: _number(raw['detectionConfidence']),
          speciesId: speciesId is String ? speciesId : null,
          classificationConfidence: classificationConfidence is num
              ? classificationConfidence.toDouble()
              : null,
        ),
      );
    }
    final rawCounts = data['speciesCounts'];
    final counts = <String, int>{};
    if (rawCounts is Map) {
      for (final entry in rawCounts.entries) {
        if (entry.key is String && entry.value is num) {
          counts[entry.key as String] = (entry.value as num).toInt();
        }
      }
    }
    return FishInferenceResult(
      fishCount: _number(data['fishCount']).toInt(),
      meanDetectionConfidence: _number(data['meanDetectionConfidence']),
      speciesCounts: counts,
      turbidityFnu: _number(data['turbidityFnu']),
      clarityScore: _number(data['clarityScore']),
      detections: detections,
    );
  }

  Map<String, Object> _configurationJson() => {
    'preferWebGpu': preferWebGpu,
    'detectorInputSize': configuration.detectorInputSize,
    'classifierInputSize': configuration.classifierInputSize,
    'classifierResizeShortSide': configuration.classifierResizeShortSide,
    'waterClarityInputSize': configuration.waterClarityInputSize,
    'maximumClassificationsPerFrame':
        configuration.maximumClassificationsPerFrame,
    'models': {
      'detector': {
        'name': 'fish detector',
        'url': _assetUrl(configuration.detectorAsset),
      },
      'classifier': {
        'name': 'species classifier',
        'url': _assetUrl(configuration.classifierAsset),
      },
      'clarity': {
        'name': 'water clarity',
        'url': _assetUrl(configuration.waterClarityAsset),
      },
    },
  };

  String _assetUrl(String asset) =>
      Uri.base.resolve('assets/$asset').toString();

  @override
  Future<void> dispose() async {
    if (_availability == FishInferenceAvailability.disposed) return;
    final pendingInitialization = _initializing;
    _availability = FishInferenceAvailability.disposed;
    _disposeWorker();
    try {
      await pendingInitialization;
    } catch (_) {
      // Worker termination rejects an in-flight initialization request.
    }
    await _singleFlight.waitUntilIdle();
  }

  void _ensureNotDisposed() {
    if (_availability == FishInferenceAvailability.disposed) {
      throw StateError('OnnxFishInference has been disposed.');
    }
  }
}

bool _readCapabilities() {
  try {
    final value =
        jsonDecode(_capabilitiesJson().toDart) as Map<String, dynamic>;
    return value['webWorker'] == true &&
        value['webAssembly'] == true &&
        value['offscreenCanvas'] == true;
  } catch (_) {
    return false;
  }
}

double _number(Object? value) {
  if (value is num && value.toDouble().isFinite) return value.toDouble();
  throw const FishInferenceException(
    'Browser inference returned a non-finite numeric value.',
    kind: FishInferenceFailureKind.modelContract,
  );
}

void _validateThresholds(FishInferenceThresholds thresholds) {
  if (!thresholds.detectionConfidence.isFinite ||
      thresholds.detectionConfidence < 0 ||
      thresholds.detectionConfidence > 1 ||
      !thresholds.classificationConfidence.isFinite ||
      thresholds.classificationConfidence < 0 ||
      thresholds.classificationConfidence > 1) {
    throw ArgumentError('Inference thresholds must be between zero and one.');
  }
}

@JS('oceanEyesInference.capabilitiesJson')
external JSString _capabilitiesJson();

@JS('oceanEyesInference.initialize')
external JSPromise<JSString> _initializeWorker(JSString configuration);

@JS('oceanEyesInference.analyze')
external JSPromise<JSString> _analyzeWorker(
  JSString configuration,
  JSUint8Array detectionPixels,
  int detectionWidth,
  int detectionHeight,
  JSUint8Array fullPixels,
  int fullWidth,
  int fullHeight,
  JSString region,
  JSString thresholds,
);

@JS('oceanEyesInference.dispose')
external void _disposeWorker();
