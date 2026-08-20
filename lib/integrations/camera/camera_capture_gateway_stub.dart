import 'dart:async';

import 'camera_capture_models.dart';

/// Web/unsupported-platform implementation selected by conditional export.
final class ProductionCameraCaptureGateway implements CameraCaptureGateway {
  ProductionCameraCaptureGateway({
    this.configuration = const CameraCaptureConfiguration(),
  });

  final CameraCaptureConfiguration configuration;
  final StreamController<CameraCaptureSnapshot> _states =
      StreamController<CameraCaptureSnapshot>.broadcast(sync: true);

  CameraCaptureSnapshot _snapshot = const CameraCaptureSnapshot(
    phase: CameraCapturePhase.idle,
    permission: CameraPermissionState.unsupported,
  );
  bool _disposed = false;

  @override
  bool get isSupported => false;

  @override
  CameraCaptureSnapshot get snapshot => _snapshot;

  @override
  Stream<CameraCaptureSnapshot> get states => _states.stream;

  @override
  Future<CameraCaptureSnapshot> initialize({
    bool requestPermission = true,
  }) async {
    if (_disposed) return _snapshot;
    return _emit(
      _snapshot.copyWith(
        phase: CameraCapturePhase.unavailable,
        permission: CameraPermissionState.unsupported,
        errorMessage:
            'Camera capture is not available on this build or platform.',
      ),
    );
  }

  @override
  Future<CapturedCameraFrame?> capture({double? normalizedWaterLineY}) async =>
      null;

  @override
  Future<CameraCaptureSnapshot> setZoom(double zoom) async => _snapshot;

  @override
  Future<CameraCaptureSnapshot> switchLens() async => _snapshot;

  @override
  Future<void> suspend() async {
    if (_disposed) return;
    _emit(_snapshot.copyWith(phase: CameraCapturePhase.suspended));
  }

  @override
  Future<CameraCaptureSnapshot> resume() =>
      initialize(requestPermission: false);

  @override
  Future<void> dispose() async {
    if (_disposed) return;
    _emit(_snapshot.copyWith(phase: CameraCapturePhase.disposed));
    _disposed = true;
    await _states.close();
  }

  CameraCaptureSnapshot _emit(CameraCaptureSnapshot value) {
    _snapshot = value;
    if (!_states.isClosed) _states.add(value);
    return value;
  }
}
