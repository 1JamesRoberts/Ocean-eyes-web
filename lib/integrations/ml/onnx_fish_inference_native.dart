import 'dart:math' as math;
import 'package:flutter/services.dart';
import 'package:image/image.dart' as image;
import 'package:onnxruntime/onnxruntime.dart';

import 'fish_inference_models.dart';
import 'fish_inference_preprocessing.dart';
import 'inference_single_flight.dart';

/// Native ONNX Runtime implementation of the deployed three-model fish pipeline.
final class OnnxFishInference implements FishInferenceEngine {
  OnnxFishInference({
    this.configuration = const FishInferenceConfiguration(),
    AssetBundle? assetBundle,
    void Function(String message)? log,
  }) : _assetBundle = assetBundle ?? rootBundle,
       _log = log;

  final FishInferenceConfiguration configuration;
  final AssetBundle _assetBundle;
  final void Function(String message)? _log;
  final InferenceSingleFlight _singleFlight = InferenceSingleFlight();

  OrtSession? _detectorSession;
  OrtSession? _classifierSession;
  OrtSession? _waterClaritySession;
  Future<void>? _initializing;
  FishInferenceAvailability _availability =
      FishInferenceAvailability.uninitialized;
  Object? _lastError;

  String _detectorInputName = 'input';
  String _classifierInputName = 'input';
  String _waterClarityInputName = 'images';
  int _detectorBoxesOutputIndex = 0;
  int _detectorLabelsOutputIndex = 1;
  int _classifierOutputIndex = 0;
  int _waterClarityOutputIndex = 0;

  @override
  bool get isSupported => true;

  @override
  bool get isBusy => _singleFlight.isBusy;

  @override
  FishInferenceAvailability get availability => _availability;

  @override
  Object? get lastError => _lastError;

  @override
  Future<void> initialize() {
    _ensureNotDisposed();
    if (_availability == FishInferenceAvailability.ready) {
      return Future.value();
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
    final timer = Stopwatch()..start();
    _availability = FishInferenceAvailability.initializing;
    _lastError = null;
    OrtSession? detector;
    OrtSession? classifier;
    OrtSession? clarity;
    OrtSessionOptions? sessionOptions;
    try {
      OrtEnv.instance.init();
      sessionOptions = OrtSessionOptions();
      detector = OrtSession.fromBuffer(
        await _loadAsset(configuration.detectorAsset),
        sessionOptions,
      );
      classifier = OrtSession.fromBuffer(
        await _loadAsset(configuration.classifierAsset),
        sessionOptions,
      );
      clarity = OrtSession.fromBuffer(
        await _loadAsset(configuration.waterClarityAsset),
        sessionOptions,
      );

      _detectorInputName = _requiredInput(detector, 'input');
      _classifierInputName = _requiredInput(classifier, 'input');
      _waterClarityInputName = _requiredInput(clarity, 'images');
      _detectorBoxesOutputIndex = _requiredOutput(detector, 'dets');
      _detectorLabelsOutputIndex = _requiredOutput(detector, 'labels');
      _classifierOutputIndex = _requiredOutput(classifier, 'output');
      _waterClarityOutputIndex = _requiredOutput(clarity, 'output0');

      _releaseSessions();
      _detectorSession = detector;
      _classifierSession = classifier;
      _waterClaritySession = clarity;
      detector = null;
      classifier = null;
      clarity = null;
      _availability = FishInferenceAvailability.ready;
      timer.stop();
      _log?.call(
        'ONNX fish pipeline ready in ${timer.elapsedMilliseconds} ms: '
        'detector=${_detectorSession!.outputNames}, '
        'classifier=${_classifierSession!.outputNames}, '
        'clarity=${_waterClaritySession!.outputNames}.',
      );
    } catch (error) {
      detector?.release();
      classifier?.release();
      clarity?.release();
      _availability = FishInferenceAvailability.failed;
      final failure = error is FishInferenceException
          ? error
          : FishInferenceException(
              'Could not load the three ONNX model assets. See '
              'assets/models/README.md.',
              kind: FishInferenceFailureKind.modelLoad,
              cause: error,
            );
      _lastError = failure;
      throw failure;
    } finally {
      sessionOptions?.release();
    }
  }

  Future<Uint8List> _loadAsset(String asset) async {
    final bytes = await _assetBundle.load(asset);
    return bytes.buffer.asUint8List(bytes.offsetInBytes, bytes.lengthInBytes);
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
        detectionRegionInFullFrame: detectionRegionInFullFrame,
        thresholds: activeThresholds,
      ),
    );
  }

  Future<FishInferenceResult> _analyze({
    required image.Image detectionRegion,
    required image.Image fullFrame,
    required NormalizedImageRegion detectionRegionInFullFrame,
    required FishInferenceThresholds thresholds,
  }) async {
    final timer = Stopwatch()..start();
    final detector = _detectorSession!;
    final classifier = _classifierSession!;
    final clarity = _waterClaritySession!;

    OrtValueTensor? detectorInput;
    OrtRunOptions? detectorOptions;
    List<OrtValue?>? detectorOutputs;
    OrtValueTensor? clarityInput;
    OrtRunOptions? clarityOptions;
    List<OrtValue?>? clarityOutputs;
    OrtValueTensor? classifierInput;
    OrtRunOptions? classifierOptions;
    List<OrtValue?>? classifierOutputs;

    try {
      detectorInput = OrtValueTensor.createTensorWithDataList(
        FishInferencePreprocessing.detectorInput(
          detectionRegion,
          size: configuration.detectorInputSize,
        ),
        [
          1,
          3,
          configuration.detectorInputSize,
          configuration.detectorInputSize,
        ],
      );
      detectorOptions = OrtRunOptions();
      detectorOutputs = await _run(detector, detectorOptions, {
        _detectorInputName: detectorInput,
      }, modelName: 'fish detector');

      // Turbidity uses the full frame and /255-only preprocessing.
      clarityInput = OrtValueTensor.createTensorWithDataList(
        FishInferencePreprocessing.waterClarityInput(
          fullFrame,
          size: configuration.waterClarityInputSize,
        ),
        [
          1,
          3,
          configuration.waterClarityInputSize,
          configuration.waterClarityInputSize,
        ],
      );
      clarityOptions = OrtRunOptions();
      clarityOutputs = await _run(clarity, clarityOptions, {
        _waterClarityInputName: clarityInput,
      }, modelName: 'water clarity');
      final probabilities = _batchedVector(
        clarityOutputs[_waterClarityOutputIndex],
        modelName: 'water clarity',
      );
      _validateVector(
        probabilities,
        modelName: 'water clarity',
        expectedLength: 11,
      );
      final turbidityFnu = FishInferencePreprocessing.turbidityFnu(
        probabilities,
      );
      final clarityScore = FishInferencePreprocessing.legacyClarityScore(
        turbidityFnu,
      );

      final detectorBoxes = _batchedRows(
        detectorOutputs[_detectorBoxesOutputIndex],
        modelName: 'fish detector boxes',
      );
      final detectorLogits = _batchedRows(
        detectorOutputs[_detectorLabelsOutputIndex],
        modelName: 'fish detector labels',
      );
      _validateRows(
        detectorBoxes,
        modelName: 'fish detector boxes',
        expectedRows: 300,
        expectedColumns: 4,
      );
      _validateRows(
        detectorLogits,
        modelName: 'fish detector labels',
        expectedRows: 300,
        expectedColumns: 2,
      );
      final candidates = FishInferencePreprocessing.detectorCandidates(
        boxes: detectorBoxes,
        labelLogits: detectorLogits,
        threshold: thresholds.detectionConfidence,
      );
      final detections = candidates
          .map(
            (candidate) => FishDetection(
              box: detectionRegionInFullFrame.mapBox(candidate.box),
              detectionConfidence: candidate.confidence,
            ),
          )
          .toList(growable: false);
      final meanConfidence = candidates.isEmpty
          ? 0.0
          : candidates.fold<double>(
                  0,
                  (sum, candidate) => sum + candidate.confidence,
                ) /
                candidates.length;

      if (candidates.isEmpty) {
        return FishInferenceResult(
          fishCount: 0,
          meanDetectionConfidence: 0,
          speciesCounts: const {},
          turbidityFnu: turbidityFnu,
          clarityScore: clarityScore,
          detections: const [],
        );
      }

      final classificationCount = math.min(
        candidates.length,
        configuration.maximumClassificationsPerFrame,
      );
      final classificationCandidates = candidates
          .take(classificationCount)
          .toList(growable: false);
      final classifierBatch = FishInferencePreprocessing.classifierBatch(
        detectionRegion,
        classificationCandidates
            .map((candidate) => candidate.box)
            .toList(growable: false),
        outputSize: configuration.classifierInputSize,
        resizeShortSide: configuration.classifierResizeShortSide,
      );
      classifierInput =
          OrtValueTensor.createTensorWithDataList(classifierBatch, [
            classificationCount,
            3,
            configuration.classifierInputSize,
            configuration.classifierInputSize,
          ]);
      classifierOptions = OrtRunOptions();
      classifierOutputs = await _run(classifier, classifierOptions, {
        _classifierInputName: classifierInput,
      }, modelName: 'species classifier');
      final classifierRows = _rows(
        classifierOutputs[_classifierOutputIndex],
        modelName: 'species classifier',
      );
      _validateRows(
        classifierRows,
        modelName: 'species classifier',
        expectedRows: classificationCount,
        expectedColumns: FishInferencePreprocessing.classifierSpecies.length,
      );

      final classifiedDetections = List<FishDetection>.of(detections);
      final speciesCounts = <String, int>{};
      final predictionCount = math.min(
        classificationCount,
        classifierRows.length,
      );
      for (var index = 0; index < predictionCount; index++) {
        final row = classifierRows[index];
        if (row is! List) continue;
        final prediction = FishInferencePreprocessing.argmaxSoftmax(
          List<Object?>.from(row),
        );
        if (prediction.probability < thresholds.classificationConfidence ||
            prediction.index < 0 ||
            prediction.index >=
                FishInferencePreprocessing.classifierSpecies.length) {
          continue;
        }
        final speciesId =
            FishInferencePreprocessing.classifierSpecies[prediction.index];
        classifiedDetections[index] = classifiedDetections[index].classify(
          speciesId: speciesId,
          confidence: prediction.probability,
        );
        speciesCounts.update(
          speciesId,
          (count) => count + 1,
          ifAbsent: () => 1,
        );
      }

      _lastError = null;
      timer.stop();
      _log?.call(
        'ONNX inference completed in ${timer.elapsedMilliseconds} ms: '
        '${candidates.length} fish, $speciesCounts, '
        '${turbidityFnu.toStringAsFixed(2)} FNU, '
        'clarity ${clarityScore.toStringAsFixed(1)}/10.',
      );
      return FishInferenceResult(
        fishCount: candidates.length,
        meanDetectionConfidence: meanConfidence,
        speciesCounts: speciesCounts,
        turbidityFnu: turbidityFnu,
        clarityScore: clarityScore,
        detections: classifiedDetections,
      );
    } catch (error) {
      _lastError = error;
      if (error is FishInferenceException) rethrow;
      throw FishInferenceException('ONNX inference failed.', cause: error);
    } finally {
      detectorInput?.release();
      detectorOptions?.release();
      detectorOutputs?.forEach((output) => output?.release());
      clarityInput?.release();
      clarityOptions?.release();
      clarityOutputs?.forEach((output) => output?.release());
      classifierInput?.release();
      classifierOptions?.release();
      classifierOutputs?.forEach((output) => output?.release());
    }
  }

  Future<List<OrtValue?>> _run(
    OrtSession session,
    OrtRunOptions options,
    Map<String, OrtValue> inputs, {
    required String modelName,
  }) async {
    final future = session.runAsync(options, inputs);
    if (future == null) {
      throw FishInferenceException('$modelName did not start inference.');
    }
    final outputs = await future;
    if (outputs.isEmpty) {
      throw FishInferenceException('$modelName returned no outputs.');
    }
    return outputs;
  }

  static List<Object?> _batchedVector(
    OrtValue? value, {
    required String modelName,
  }) {
    final raw = value?.value;
    if (raw is! List || raw.isEmpty || raw.first is! List) {
      throw FishInferenceException(
        '$modelName returned an invalid tensor.',
        kind: FishInferenceFailureKind.modelContract,
      );
    }
    return List<Object?>.from(raw.first as List);
  }

  static List<Object?> _batchedRows(
    OrtValue? value, {
    required String modelName,
  }) {
    final raw = value?.value;
    if (raw is! List || raw.isEmpty || raw.first is! List) {
      throw FishInferenceException(
        '$modelName returned an invalid tensor.',
        kind: FishInferenceFailureKind.modelContract,
      );
    }
    final batch = raw.first;
    if (batch is! List) {
      throw FishInferenceException(
        '$modelName returned an invalid batch.',
        kind: FishInferenceFailureKind.modelContract,
      );
    }
    return List<Object?>.from(batch);
  }

  static List<Object?> _rows(OrtValue? value, {required String modelName}) {
    final raw = value?.value;
    if (raw is! List) {
      throw FishInferenceException(
        '$modelName returned an invalid tensor.',
        kind: FishInferenceFailureKind.modelContract,
      );
    }
    return List<Object?>.from(raw);
  }

  static String _requiredInput(OrtSession session, String name) {
    if (session.inputNames.contains(name)) return name;
    throw FishInferenceException(
      'Model input "$name" is missing from ${session.inputNames}.',
      kind: FishInferenceFailureKind.modelContract,
    );
  }

  static int _requiredOutput(OrtSession session, String name) {
    final index = session.outputNames.indexOf(name);
    if (index >= 0) return index;
    throw FishInferenceException(
      'Model output "$name" is missing from ${session.outputNames}.',
      kind: FishInferenceFailureKind.modelContract,
    );
  }

  static void _validateVector(
    List<Object?> values, {
    required String modelName,
    required int expectedLength,
  }) {
    if (values.length != expectedLength ||
        values.any((value) => value is! num || !value.toDouble().isFinite)) {
      throw FishInferenceException(
        '$modelName output must contain $expectedLength finite values.',
        kind: FishInferenceFailureKind.modelContract,
      );
    }
  }

  static void _validateRows(
    List<Object?> rows, {
    required String modelName,
    required int expectedRows,
    required int expectedColumns,
  }) {
    final valid =
        rows.length == expectedRows &&
        rows.every(
          (row) =>
              row is List &&
              row.length == expectedColumns &&
              row.every((value) => value is num && value.toDouble().isFinite),
        );
    if (!valid) {
      throw FishInferenceException(
        '$modelName output must have shape '
        '[$expectedRows,$expectedColumns] with finite values.',
        kind: FishInferenceFailureKind.modelContract,
      );
    }
  }

  static void _validateThresholds(FishInferenceThresholds thresholds) {
    if (!thresholds.detectionConfidence.isFinite ||
        thresholds.detectionConfidence < 0 ||
        thresholds.detectionConfidence > 1 ||
        !thresholds.classificationConfidence.isFinite ||
        thresholds.classificationConfidence < 0 ||
        thresholds.classificationConfidence > 1) {
      throw ArgumentError('Inference thresholds must be between zero and one.');
    }
  }

  void _releaseSessions() {
    _detectorSession?.release();
    _classifierSession?.release();
    _waterClaritySession?.release();
    _detectorSession = null;
    _classifierSession = null;
    _waterClaritySession = null;
  }

  @override
  Future<void> dispose() async {
    if (_availability == FishInferenceAvailability.disposed) return;
    final initializing = _initializing;
    if (initializing != null) {
      try {
        await initializing;
      } catch (_) {
        // Initialization already recorded the error; release anything below.
      }
    }
    await _singleFlight.waitUntilIdle();
    _releaseSessions();
    _availability = FishInferenceAvailability.disposed;
  }

  void _ensureNotDisposed() {
    if (_availability == FishInferenceAvailability.disposed) {
      throw StateError('OnnxFishInference has been disposed.');
    }
  }
}
