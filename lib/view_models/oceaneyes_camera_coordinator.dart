import 'dart:async';
import 'dart:typed_data';

import 'package:flutter/widgets.dart';

import '../integrations/camera/camera_capture_gateway.dart';
import '../integrations/ml/onnx_fish_inference.dart';
import '../models/aquarium_models.dart';
import '../models/production_data.dart';
import '../models/production_repository.dart';
import 'oceaneyes_wake_lock_coordinator.dart';

/// Narrow state port used by the production camera/ML runtime.
abstract interface class OceanEyesCameraHost {
  bool get isDisposed;
  bool get tankConnected;
  bool get aiEnabled;
  bool get autoConnect;
  String? get activeTankId;
  double? get cameraWaterLineY;
  double get pollingIntervalMs;
  double get detectionConfidenceThreshold;
  double get speciesConfidenceThreshold;
  List<FishEntry> get fish;

  CameraStage get cameraStage;
  set cameraStage(CameraStage value);
  bool get usingFrontCamera;
  set usingFrontCamera(bool value);
  String? get productionError;
  set productionError(String? value);
  String? get lastTurbidityResult;
  set lastTurbidityResult(String? value);
  Uint8List? get latestCameraFrameBytes;
  set latestCameraFrameBytes(Uint8List? value);
  List<NormalizedDetectionCenter> get heatmapCenters;
  set heatmapCenters(List<NormalizedDetectionCenter> value);
  DetectionFrameDimensions get heatmapSourceDimensions;
  set heatmapSourceDimensions(DetectionFrameDimensions value);
}

/// Owns camera lifecycle, single-flight capture/ML, inference scheduling, and
/// QR-scanner camera handoff.
class OceanEyesCameraCoordinator {
  OceanEyesCameraCoordinator({
    required bool enabled,
    required OceanEyesCameraHost host,
    required ProductionOceanEyesRepository? repository,
    required CameraCaptureGateway? gateway,
    required FishInferenceEngine? inference,
    required OceanEyesWakeLockCoordinator wakeLock,
    required CameraHandoffConfiguration handoffConfiguration,
    required CameraHandoffDelay handoffDelay,
    required bool Function() isLivePublishing,
    required Future<void> Function() stopLive,
    required void Function() persist,
    required void Function(Object error, [StackTrace? stackTrace]) onError,
    required VoidCallback onChanged,
  }) : _enabled = enabled,
       _host = host,
       _repository = repository,
       _gateway = gateway,
       _inference = inference,
       _wakeLock = wakeLock,
       _handoffConfiguration = handoffConfiguration,
       _handoffDelay = handoffDelay,
       _isLivePublishing = isLivePublishing,
       _stopLive = stopLive,
       _persist = persist,
       _onError = onError,
       _onChanged = onChanged;

  final bool _enabled;
  final OceanEyesCameraHost _host;
  final ProductionOceanEyesRepository? _repository;
  final CameraCaptureGateway? _gateway;
  final FishInferenceEngine? _inference;
  final OceanEyesWakeLockCoordinator _wakeLock;
  final CameraHandoffConfiguration _handoffConfiguration;
  final CameraHandoffDelay _handoffDelay;
  final bool Function() _isLivePublishing;
  final Future<void> Function() _stopLive;
  final VoidCallback _persist;
  final void Function(Object error, [StackTrace? stackTrace]) _onError;
  final VoidCallback _onChanged;

  StreamSubscription<CameraCaptureSnapshot>? _subscription;
  Timer? _inferenceTimer;
  bool _captureInProgress = false;
  bool _modelLoadBlocked = false;
  int _pairingSuspensionDepth = 0;
  bool _resumeAfterPairing = false;

  void initialize() {
    final gateway = _gateway;
    if (!_enabled || gateway == null || _subscription != null) return;
    _applySnapshot(gateway.snapshot);
    _subscription = gateway.states.listen(_applySnapshot, onError: _onError);
  }

  Future<void> requestPermission() async {
    final gateway = _gateway;
    if (gateway == null) {
      _host.cameraStage = CameraStage.unavailable;
      _host.productionError =
          'Camera capture is not supported on this platform.';
      _onChanged();
      return;
    }
    try {
      _applySnapshot(await gateway.initialize());
      configureAutomaticInference();
    } catch (error, stackTrace) {
      _onError(error, stackTrace);
      _applySnapshot(gateway.snapshot);
    }
  }

  Future<void> switchLens() async {
    final gateway = _gateway;
    if (gateway == null) return;
    try {
      _applySnapshot(await gateway.switchLens());
      _persist();
    } catch (error, stackTrace) {
      _onError(error, stackTrace);
    }
  }

  Future<void> resume() async {
    final gateway = _gateway;
    if (gateway == null) return;
    try {
      _applySnapshot(await gateway.resume());
      configureAutomaticInference();
    } catch (error, stackTrace) {
      _onError(error, stackTrace);
    }
  }

  Future<void> captureAndAnalyze({
    required bool measurementOnly,
    bool userInitiated = true,
  }) async {
    final gateway = _gateway;
    final inference = _inference;
    final repository = _repository;
    final tankId = _host.activeTankId;
    if (_captureInProgress) return;
    if (gateway == null) {
      if (userInitiated) {
        _onError(
          const CameraCaptureException(
            'Camera capture is unavailable on this platform.',
          ),
        );
      }
      return;
    }
    if (inference == null || !inference.isSupported) {
      if (userInitiated) {
        _onError(
          const FishInferenceException(
            'AI model initialization is unavailable on this platform.',
            kind: FishInferenceFailureKind.modelLoad,
          ),
        );
      }
      return;
    }
    if (repository == null || tankId == null) {
      if (userInitiated) {
        _onError(StateError('No tank is connected for aquarium analysis.'));
      }
      return;
    }
    if (gateway.snapshot.phase != CameraCapturePhase.ready) {
      if (userInitiated) {
        _onError(
          const CameraCaptureException(
            'Camera is not ready to capture an aquarium frame.',
          ),
        );
      }
      return;
    }
    _captureInProgress = true;
    _host.productionError = null;
    _host.cameraStage = measurementOnly
        ? CameraStage.measuringTurbidity
        : CameraStage.aiProcessing;
    _onChanged();
    CapturedCameraFrame? frame;
    try {
      try {
        frame = await gateway.capture(
          normalizedWaterLineY: _host.cameraWaterLineY,
        );
      } catch (error, stackTrace) {
        _onError(error, stackTrace);
        return;
      }
      if (frame == null) {
        if (userInitiated) {
          _onError(
            const CameraCaptureException(
              'Camera capture did not return an aquarium frame.',
            ),
          );
        }
        return;
      }

      _host.latestCameraFrameBytes = Uint8List.fromList(frame.encodedBytes);
      try {
        await inference.initialize();
        _modelLoadBlocked = false;
      } catch (error, stackTrace) {
        _modelLoadBlocked = true;
        stopAutomaticInference();
        final kind = error is FishInferenceException
            ? error.kind
            : FishInferenceFailureKind.modelLoad;
        _onError(
          FishInferenceException(
            kind == FishInferenceFailureKind.modelContract
                ? 'AI model contract validation failed.'
                : 'AI model initialization failed.',
            kind: kind,
            cause: error,
          ),
          stackTrace,
        );
        return;
      }

      FishInferenceResult? result;
      try {
        result = await inference.analyze(
          detectionRegion: frame.waterRegion,
          fullFrame: frame.fullFrame,
          detectionRegionInFullFrame: NormalizedImageRegion.belowWaterLine(
            frame.waterRegionTopNormalized,
          ),
          thresholds: FishInferenceThresholds(
            detectionConfidence: _host.detectionConfidenceThreshold,
            classificationConfidence: _host.speciesConfidenceThreshold,
          ),
        );
      } catch (error, stackTrace) {
        final kind = error is FishInferenceException
            ? error.kind
            : FishInferenceFailureKind.execution;
        if (kind == FishInferenceFailureKind.modelLoad ||
            kind == FishInferenceFailureKind.modelContract) {
          _modelLoadBlocked = true;
          stopAutomaticInference();
        }
        _onError(
          FishInferenceException(
            kind == FishInferenceFailureKind.modelContract
                ? 'AI model contract validation failed.'
                : 'Aquarium AI analysis failed.',
            kind: kind,
            cause: error,
          ),
          stackTrace,
        );
        return;
      }
      if (result == null) return;

      _host.lastTurbidityResult =
          '${result.turbidityFnu.toStringAsFixed(1)} FNU';
      _host.heatmapCenters = result.classifiedCenters
          .map(
            (center) => NormalizedDetectionCenter(
              nx: center.nx,
              ny: center.ny,
              speciesId: center.speciesId,
            ),
          )
          .toList(growable: false);
      _host.heatmapSourceDimensions = DetectionFrameDimensions(
        width: frame.fullFrame.width,
        height: frame.fullFrame.height,
      );
      try {
        await repository.writeReading(
          ProductionReadingDraft(
            tankId: tankId,
            clarityScore: result.clarityScore,
            turbidityFnu: result.turbidityFnu,
            fishCount: result.fishCount,
            fishCountConfidence: result.meanDetectionConfidence,
            speciesDetected: result.speciesCounts,
            detections: _host.heatmapCenters,
            frameDimensions: _host.heatmapSourceDimensions,
          ),
        );
        for (final entry in _host.fish) {
          final detected = (result.speciesCounts[entry.speciesId] ?? 0).clamp(
            0,
            entry.count,
          );
          await repository.updateDetectedFish(entry.id, detected);
        }
      } catch (error, stackTrace) {
        _onError(
          StateError(
            'Analysis completed but some results could not be saved: $error',
          ),
          stackTrace,
        );
      }
    } catch (error, stackTrace) {
      _onError(error, stackTrace);
    } finally {
      _captureInProgress = false;
      if (!_host.isDisposed) {
        _applySnapshot(gateway.snapshot);
        if (!_modelLoadBlocked) configureAutomaticInference();
        _onChanged();
      }
    }
  }

  void configureAutomaticInference() {
    _inferenceTimer?.cancel();
    _inferenceTimer = null;
    final inference = _inference;
    final automaticInferenceAllowed = switch (inference) {
      FishInferenceDiagnostics diagnostics =>
        diagnostics.automaticInferenceEnabled,
      _ => true,
    };
    if (!_enabled ||
        !_host.aiEnabled ||
        !_host.autoConnect ||
        _host.activeTankId == null ||
        _repository == null ||
        _modelLoadBlocked ||
        inference?.isSupported != true ||
        !automaticInferenceAllowed ||
        _gateway?.snapshot.phase != CameraCapturePhase.ready) {
      _wakeLock.setInferenceActive(false);
      return;
    }
    final interval = Duration(
      milliseconds: _host.pollingIntervalMs.round().clamp(1000, 3600000),
    );
    _inferenceTimer = Timer.periodic(interval, (_) {
      if (_host.cameraStage == CameraStage.active) {
        unawaited(
          captureAndAnalyze(measurementOnly: false, userInitiated: false),
        );
      }
    });
    _wakeLock.setInferenceActive(true);
  }

  void stopAutomaticInference() {
    _inferenceTimer?.cancel();
    _inferenceTimer = null;
    _wakeLock.setInferenceActive(false);
  }

  void handleLifecycleState(AppLifecycleState state) {
    if (!_enabled || _gateway == null) return;
    switch (state) {
      case AppLifecycleState.resumed:
        if (!_isLivePublishing() && _host.tankConnected) unawaited(resume());
      case AppLifecycleState.inactive:
      case AppLifecycleState.hidden:
      case AppLifecycleState.paused:
      case AppLifecycleState.detached:
        stopAutomaticInference();
        if (!_isLivePublishing()) unawaited(_gateway.suspend());
    }
  }

  Future<void> suspendForPairing() async {
    final gateway = _gateway;
    if (!_enabled || gateway == null || _host.isDisposed) return;
    _pairingSuspensionDepth += 1;
    if (_pairingSuspensionDepth > 1) return;
    await _stopLive();
    if (_host.isDisposed) return;
    stopAutomaticInference();
    _resumeAfterPairing = switch (gateway.snapshot.phase) {
      CameraCapturePhase.requestingPermission ||
      CameraCapturePhase.opening ||
      CameraCapturePhase.ready ||
      CameraCapturePhase.capturing => true,
      _ => false,
    };
    if (!_resumeAfterPairing) return;
    try {
      await gateway.suspend();
      await _settle(_handoffConfiguration.afterCameraRelease);
    } catch (error, stackTrace) {
      _onError(error, stackTrace);
    }
  }

  Future<void> resumeAfterPairing() async {
    final gateway = _gateway;
    if (!_enabled || gateway == null || _host.isDisposed) return;
    if (_pairingSuspensionDepth == 0) return;
    _pairingSuspensionDepth -= 1;
    if (_pairingSuspensionDepth > 0) return;
    final shouldResume = _resumeAfterPairing;
    _resumeAfterPairing = false;
    if (shouldResume && !_isLivePublishing()) {
      try {
        _applySnapshot(await gateway.resume());
      } catch (error, stackTrace) {
        _onError(error, stackTrace);
      }
    }
    configureAutomaticInference();
  }

  void _applySnapshot(CameraCaptureSnapshot snapshot) {
    if (_host.isDisposed || !_enabled || _captureInProgress) return;
    _host.usingFrontCamera =
        snapshot.activeLens?.facing == CameraLensFacing.front;
    _host.cameraStage = switch (snapshot.phase) {
      CameraCapturePhase.idle => CameraStage.beforePermission,
      CameraCapturePhase.requestingPermission ||
      CameraCapturePhase.opening => CameraStage.requestingPermission,
      CameraCapturePhase.ready => CameraStage.active,
      CameraCapturePhase.capturing => CameraStage.aiProcessing,
      CameraCapturePhase.permissionDenied => CameraStage.denied,
      CameraCapturePhase.suspended => CameraStage.idle,
      CameraCapturePhase.unavailable ||
      CameraCapturePhase.failed ||
      CameraCapturePhase.disposed => CameraStage.unavailable,
    };
    if (snapshot.errorMessage != null) {
      _host.productionError = snapshot.errorMessage;
    }
    switch (snapshot.phase) {
      case CameraCapturePhase.idle:
      case CameraCapturePhase.permissionDenied:
      case CameraCapturePhase.suspended:
      case CameraCapturePhase.unavailable:
      case CameraCapturePhase.failed:
      case CameraCapturePhase.disposed:
        stopAutomaticInference();
      case CameraCapturePhase.requestingPermission:
      case CameraCapturePhase.opening:
      case CameraCapturePhase.ready:
      case CameraCapturePhase.capturing:
        break;
    }
    _onChanged();
  }

  Future<void> _settle(Duration duration) {
    if (duration == Duration.zero || duration.isNegative) {
      return Future<void>.value();
    }
    return _handoffDelay(duration);
  }

  Future<void> dispose() async {
    stopAutomaticInference();
    await _subscription?.cancel();
    _subscription = null;
    await _inference?.dispose();
    await _gateway?.dispose();
  }
}
