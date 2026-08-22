import 'dart:async';
import 'dart:io';

import 'package:camera/camera.dart' as plugin;
import 'package:image/image.dart' as image;
import 'package:permission_handler/permission_handler.dart';

import 'camera_capture_models.dart';
import 'camera_operation_queue.dart';
import 'water_line_cropper.dart';

/// Native production camera implementation.
///
/// The camera plugin stays behind this gateway so the controller can coordinate
/// capture and LiveKit ownership without importing plugin types into MVVM state.
final class ProductionCameraCaptureGateway implements CameraCaptureGateway {
  ProductionCameraCaptureGateway({
    this.configuration = const CameraCaptureConfiguration(),
    DateTime Function()? clock,
    void Function(String message)? log,
  }) : _clock = clock ?? DateTime.now,
       _log = log;

  final CameraCaptureConfiguration configuration;
  final DateTime Function() _clock;
  final void Function(String message)? _log;
  final StreamController<CameraCaptureSnapshot> _states =
      StreamController<CameraCaptureSnapshot>.broadcast(sync: true);

  CameraCaptureSnapshot _snapshot = const CameraCaptureSnapshot.initial();
  plugin.CameraController? _controller;
  List<plugin.CameraDescription> _cameraDescriptions = const [];
  String? _selectedCameraName;
  Future<CapturedCameraFrame?>? _activeCapture;
  final CameraOperationQueue _cameraOperations = CameraOperationQueue();
  bool _disposed = false;

  @override
  bool get isSupported => true;

  @override
  CameraCaptureSnapshot get snapshot => _snapshot;

  @override
  Stream<CameraCaptureSnapshot> get states => _states.stream;

  @override
  Future<CameraCaptureSnapshot> initialize({bool requestPermission = true}) {
    _ensureNotDisposed();
    return _cameraOperations.run(() {
      _ensureNotDisposed();
      if (_controller?.value.isInitialized ?? false) return _snapshot;
      return _initialize(requestPermission: requestPermission);
    });
  }

  Future<CameraCaptureSnapshot> _initialize({
    required bool requestPermission,
  }) async {
    _emit(
      _snapshot.copyWith(
        phase: requestPermission
            ? CameraCapturePhase.requestingPermission
            : CameraCapturePhase.opening,
        clearError: true,
      ),
    );

    try {
      final permissionStatus =
          await (requestPermission
                  ? Permission.camera.request()
                  : Permission.camera.status)
              .timeout(configuration.permissionTimeout);
      final permission = _mapPermission(permissionStatus);
      if (permission != CameraPermissionState.granted) {
        return _emit(
          _snapshot.copyWith(
            phase: CameraCapturePhase.permissionDenied,
            permission: permission,
            lenses: const [],
            clearActiveLens: true,
            errorMessage: permission == CameraPermissionState.permanentlyDenied
                ? 'Camera permission is permanently denied. Enable it in '
                      'system settings.'
                : 'Camera permission was not granted.',
          ),
        );
      }

      _emit(
        _snapshot.copyWith(
          phase: CameraCapturePhase.opening,
          permission: CameraPermissionState.granted,
          clearError: true,
        ),
      );
      final discovered = await plugin.availableCameras().timeout(
        configuration.discoveryTimeout,
      );
      if (discovered.isEmpty) {
        return _emit(
          _snapshot.copyWith(
            phase: CameraCapturePhase.unavailable,
            lenses: const [],
            clearActiveLens: true,
            errorMessage: 'No camera was reported by this device.',
          ),
        );
      }

      _cameraDescriptions = CameraLensOrdering.preferred(
        discovered,
        preferBackCamera: configuration.preferBackCamera,
        isBackCamera: (camera) =>
            camera.lensDirection == plugin.CameraLensDirection.back,
      );

      var selectedIndex = 0;
      final previousName = _selectedCameraName;
      if (previousName != null) {
        final previousIndex = _cameraDescriptions.indexWhere(
          (camera) => camera.name == previousName,
        );
        if (previousIndex >= 0) selectedIndex = previousIndex;
      }
      return await _openAt(selectedIndex);
    } on TimeoutException catch (error) {
      return _fail('Timed out while opening the camera.', error);
    } on plugin.CameraException catch (error) {
      return _fail('The camera plugin could not open the camera.', error);
    } catch (error) {
      return _fail('Could not initialize camera capture.', error);
    }
  }

  Future<CameraCaptureSnapshot> _openAt(int index) async {
    if (index < 0 || index >= _cameraDescriptions.length) {
      throw RangeError.index(index, _cameraDescriptions, 'index');
    }

    await _disposeController();
    final description = _cameraDescriptions[index];
    final controller = plugin.CameraController(
      description,
      _resolutionPreset(configuration.resolution),
      enableAudio: configuration.enableAudio,
    );

    try {
      await controller.initialize().timeout(
        configuration.initializationTimeout,
      );
      if (_disposed) {
        await controller.dispose();
        throw const CameraCaptureException(
          'Camera gateway was disposed while a camera was opening.',
        );
      }

      var minimumZoom = 1.0;
      var maximumZoom = 1.0;
      try {
        minimumZoom = await controller.getMinZoomLevel();
        maximumZoom = await controller.getMaxZoomLevel();
        await controller.setZoomLevel(minimumZoom);
      } catch (error) {
        // Zoom support is optional; it must not take down frame capture.
        _log?.call('Camera zoom unavailable: $error');
        minimumZoom = 1;
        maximumZoom = 1;
      }

      _controller = controller;
      _selectedCameraName = description.name;
      final lenses = List<CameraLensInfo>.unmodifiable(
        _cameraDescriptions.map(_lensInfo),
      );
      return _emit(
        CameraCaptureSnapshot(
          phase: CameraCapturePhase.ready,
          permission: CameraPermissionState.granted,
          lenses: lenses,
          activeLensIndex: index,
          minimumZoom: minimumZoom,
          maximumZoom: maximumZoom,
          zoom: minimumZoom,
        ),
      );
    } catch (_) {
      await controller.dispose();
      rethrow;
    }
  }

  @override
  Future<CapturedCameraFrame?> capture({double? normalizedWaterLineY}) {
    _ensureNotDisposed();
    if (_activeCapture != null ||
        _cameraOperations.isBusy ||
        _snapshot.phase != CameraCapturePhase.ready) {
      return Future.value(null);
    }
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) {
      return Future.value(null);
    }

    late final Future<CapturedCameraFrame?> operation;
    operation = _capture(controller, normalizedWaterLineY).whenComplete(() {
      if (identical(_activeCapture, operation)) _activeCapture = null;
    });
    _activeCapture = operation;
    return operation;
  }

  Future<CapturedCameraFrame?> _capture(
    plugin.CameraController controller,
    double? normalizedWaterLineY,
  ) async {
    _emit(
      _snapshot.copyWith(phase: CameraCapturePhase.capturing, clearError: true),
    );

    plugin.XFile? capture;
    try {
      capture = await controller.takePicture().timeout(
        configuration.captureTimeout,
      );
      final bytes = await capture.readAsBytes().timeout(
        configuration.captureTimeout,
      );
      final decoded = image.decodeImage(bytes);
      if (decoded == null) {
        throw const CameraCaptureException(
          'The captured bytes were not a supported image.',
        );
      }
      final crop = WaterLineCropper.belowWaterLine(
        decoded,
        normalizedWaterLineY,
      );

      _emit(
        _snapshot.copyWith(phase: CameraCapturePhase.ready, clearError: true),
      );
      return CapturedCameraFrame(
        encodedBytes: bytes,
        fullFrame: decoded,
        waterRegion: crop.image,
        waterRegionTopPixels: crop.topPixels,
        waterRegionTopNormalized: crop.topNormalized,
        capturedAt: _clock(),
      );
    } catch (error) {
      _emit(
        _snapshot.copyWith(
          phase: CameraCapturePhase.ready,
          errorMessage:
              'Camera capture failed. Check camera access and try again.',
        ),
      );
      if (error is CameraCaptureException) rethrow;
      throw CameraCaptureException('Could not capture a camera frame.', error);
    } finally {
      final path = capture?.path;
      if (path != null && path.isNotEmpty) {
        try {
          await File(path).delete();
        } catch (_) {
          // Camera plugins use a temporary file for stills. Cleanup is
          // best-effort because some platform implementations own the file.
        }
      }
    }
  }

  @override
  Future<CameraCaptureSnapshot> switchLens() {
    _ensureNotDisposed();
    return _cameraOperations.run(() async {
      _ensureNotDisposed();
      if (_cameraDescriptions.length < 2) return _snapshot;
      try {
        final current = _snapshot.activeLensIndex ?? 0;
        final next = (current + 1) % _cameraDescriptions.length;
        _emit(
          _snapshot.copyWith(
            phase: CameraCapturePhase.opening,
            activeLensIndex: next,
            clearError: true,
          ),
        );
        await _waitForCapture();
        return await _openAt(next);
      } catch (error) {
        return _fail('Could not switch camera lenses.', error);
      }
    });
  }

  @override
  Future<CameraCaptureSnapshot> setZoom(double zoom) {
    _ensureNotDisposed();
    return _cameraOperations.run(() async {
      _ensureNotDisposed();
      if (_snapshot.phase != CameraCapturePhase.ready) return _snapshot;
      final controller = _controller;
      if (controller == null || !controller.value.isInitialized) {
        return _snapshot;
      }
      final clamped = zoom
          .clamp(_snapshot.minimumZoom, _snapshot.maximumZoom)
          .toDouble();
      try {
        await controller.setZoomLevel(clamped);
        return _emit(_snapshot.copyWith(zoom: clamped, clearError: true));
      } catch (error) {
        return _emit(
          _snapshot.copyWith(errorMessage: 'Could not change camera zoom.'),
        );
      }
    });
  }

  @override
  Future<void> suspend() {
    if (_disposed) return Future<void>.value();
    return _cameraOperations.run(() async {
      if (_disposed) return;
      await _waitForCapture();
      await _disposeController();
      _emit(
        _snapshot.copyWith(
          phase: CameraCapturePhase.suspended,
          minimumZoom: 1,
          maximumZoom: 1,
          zoom: 1,
          clearError: true,
        ),
      );
    });
  }

  @override
  Future<CameraCaptureSnapshot> resume() {
    _ensureNotDisposed();
    return _cameraOperations.run(() {
      _ensureNotDisposed();
      if (_controller?.value.isInitialized ?? false) return _snapshot;
      return _initialize(requestPermission: false);
    });
  }

  Future<void> _waitForCapture() async {
    final capture = _activeCapture;
    if (capture == null) return;
    try {
      await capture;
    } catch (_) {
      // Releasing the camera remains necessary even if capture failed.
    }
  }

  Future<void> _disposeController() async {
    final controller = _controller;
    _controller = null;
    if (controller == null) return;
    try {
      await controller.dispose();
    } catch (error) {
      _log?.call('Camera dispose failed: $error');
    }
  }

  @override
  Future<void> dispose() {
    if (_disposed) return Future<void>.value();
    return _cameraOperations.run(() async {
      if (_disposed) return;
      await _waitForCapture();
      await _disposeController();
      _emit(
        _snapshot.copyWith(
          phase: CameraCapturePhase.disposed,
          clearActiveLens: true,
          minimumZoom: 1,
          maximumZoom: 1,
          zoom: 1,
        ),
      );
      _disposed = true;
      await _states.close();
    });
  }

  CameraCaptureSnapshot _fail(String message, Object error) {
    _log?.call('$message $error');
    return _emit(
      _snapshot.copyWith(
        phase: CameraCapturePhase.failed,
        errorMessage: message,
      ),
    );
  }

  CameraCaptureSnapshot _emit(CameraCaptureSnapshot value) {
    _snapshot = value;
    if (!_states.isClosed) _states.add(value);
    return value;
  }

  void _ensureNotDisposed() {
    if (_disposed) {
      throw StateError('CameraCaptureGateway has been disposed.');
    }
  }
}

CameraPermissionState _mapPermission(PermissionStatus status) {
  if (status.isGranted || status.isLimited) {
    return CameraPermissionState.granted;
  }
  if (status.isPermanentlyDenied) {
    return CameraPermissionState.permanentlyDenied;
  }
  if (status.isRestricted) return CameraPermissionState.restricted;
  return CameraPermissionState.denied;
}

plugin.ResolutionPreset _resolutionPreset(CameraCaptureResolution resolution) {
  return switch (resolution) {
    CameraCaptureResolution.low => plugin.ResolutionPreset.low,
    CameraCaptureResolution.medium => plugin.ResolutionPreset.medium,
    CameraCaptureResolution.high => plugin.ResolutionPreset.high,
    CameraCaptureResolution.veryHigh => plugin.ResolutionPreset.veryHigh,
    CameraCaptureResolution.maximum => plugin.ResolutionPreset.max,
  };
}

CameraLensInfo _lensInfo(plugin.CameraDescription description) {
  return CameraLensInfo(
    id: description.name,
    name: description.name,
    facing: switch (description.lensDirection) {
      plugin.CameraLensDirection.back => CameraLensFacing.back,
      plugin.CameraLensDirection.front => CameraLensFacing.front,
      plugin.CameraLensDirection.external => CameraLensFacing.external,
    },
    sensorOrientation: description.sensorOrientation,
  );
}
