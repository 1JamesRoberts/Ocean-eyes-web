import 'dart:async';
import 'dart:js_interop';

import 'package:camera/camera.dart' as plugin;
import 'package:flutter/widgets.dart';
import 'package:image/image.dart' as image;

import 'camera_capture_models.dart';
import 'camera_operation_queue.dart';
import 'water_line_cropper.dart';

/// Browser implementation backed by the endorsed `camera_web` plugin.
///
/// `availableCameras()` invokes `getUserMedia`, so it is both the permission
/// request and device-enumeration operation on web. Browsers require HTTPS (or
/// localhost) and may not expose zoom unless the Image Capture API supports it.
final class ProductionCameraCaptureGateway
    implements CameraCaptureGateway, CameraPreviewSource {
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
  int? _selectedCameraIndex;
  Future<CapturedCameraFrame?>? _activeCapture;
  final CameraOperationQueue _cameraOperations = CameraOperationQueue();
  bool _disposed = false;

  @override
  bool get isSupported => true;

  @override
  Widget? get cameraPreview {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) return null;
    return plugin.CameraPreview(controller);
  }

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
      // camera_web combines getUserMedia permission and enumeration in this
      // call. `requestPermission: false` therefore means "do not present our
      // own prompt"; the browser still decides whether remembered permission
      // is sufficient to reacquire the stream.
      final timeout = requestPermission
          ? configuration.permissionTimeout + configuration.discoveryTimeout
          : configuration.discoveryTimeout;
      final discovered = await plugin.availableCameras().timeout(timeout);
      if (discovered.isEmpty) {
        return _emit(
          _snapshot.copyWith(
            phase: CameraCapturePhase.unavailable,
            permission: CameraPermissionState.granted,
            lenses: const [],
            clearActiveLens: true,
            minimumZoom: 1,
            maximumZoom: 1,
            zoom: 1,
            errorMessage: 'No camera was reported by this browser.',
          ),
        );
      }

      _cameraDescriptions = _orderedCameras(discovered);
      var selectedIndex = (_selectedCameraIndex ?? 0).clamp(
        0,
        _cameraDescriptions.length - 1,
      );
      final previousName = _selectedCameraName;
      if (previousName != null && previousName.isNotEmpty) {
        final namedIndex = _cameraDescriptions.indexWhere(
          (camera) => camera.name == previousName,
        );
        if (namedIndex >= 0) selectedIndex = namedIndex;
      }

      _emit(
        _snapshot.copyWith(
          phase: CameraCapturePhase.opening,
          permission: CameraPermissionState.granted,
          clearError: true,
        ),
      );
      return await _openAt(selectedIndex);
    } on TimeoutException catch (error) {
      return _fail(
        'Timed out while waiting for browser camera permission or devices.',
        error,
      );
    } on plugin.CameraException catch (error) {
      return _cameraExceptionState(
        error,
        fallbackMessage: 'Could not initialize browser camera capture.',
      );
    } catch (error) {
      return _fail('Could not initialize browser camera capture.', error);
    }
  }

  List<plugin.CameraDescription> _orderedCameras(
    List<plugin.CameraDescription> discovered,
  ) => CameraLensOrdering.preferred(
    discovered,
    preferBackCamera: configuration.preferBackCamera,
    isBackCamera: (camera) =>
        camera.lensDirection == plugin.CameraLensDirection.back,
  );

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
          'Camera gateway was disposed while a browser camera was opening.',
        );
      }

      var minimumZoom = 1.0;
      var maximumZoom = 1.0;
      try {
        minimumZoom = await controller.getMinZoomLevel();
        maximumZoom = await controller.getMaxZoomLevel();
        await controller.setZoomLevel(minimumZoom);
      } catch (error) {
        // Safari, Firefox, and cameras without MediaTrack zoom constraints may
        // reject zoom APIs. Still capture remains fully usable.
        _log?.call('Browser camera zoom unavailable: $error');
        minimumZoom = 1;
        maximumZoom = 1;
      }

      _controller = controller;
      _selectedCameraName = description.name;
      _selectedCameraIndex = index;
      final lenses = List<CameraLensInfo>.unmodifiable([
        for (
          var lensIndex = 0;
          lensIndex < _cameraDescriptions.length;
          lensIndex++
        )
          _lensInfo(_cameraDescriptions[lensIndex], lensIndex),
      ]);
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
      try {
        await controller.dispose();
      } catch (_) {
        // Preserve the original initialization failure.
      }
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
          'The browser camera returned an unsupported image.',
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
      final permission = error is plugin.CameraException
          ? _permissionStateFor(error)
          : null;
      if (permission != null) {
        _emit(
          _snapshot.copyWith(
            phase: CameraCapturePhase.permissionDenied,
            permission: permission,
            errorMessage: _browserErrorMessage(error as plugin.CameraException),
          ),
        );
      } else {
        _emit(
          _snapshot.copyWith(
            phase: CameraCapturePhase.ready,
            errorMessage:
                'Browser camera capture failed. Check camera access '
                'and try again.',
          ),
        );
      }
      if (error is CameraCaptureException) rethrow;
      throw CameraCaptureException(
        'Could not capture a browser camera frame.',
        error,
      );
    } finally {
      final path = capture?.path;
      if (path != null && path.startsWith('blob:')) {
        try {
          _revokeObjectUrl(path);
        } catch (_) {
          // The bytes are already materialized. Revocation is best-effort on
          // browsers with nonstandard blob URL behavior.
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
      } on plugin.CameraException catch (error) {
        return _cameraExceptionState(
          error,
          fallbackMessage: 'Could not switch browser cameras.',
        );
      } catch (error) {
        return _fail('Could not switch browser cameras.', error);
      }
    });
  }

  @override
  Future<CameraCaptureSnapshot> setZoom(double zoom) {
    _ensureNotDisposed();
    return _cameraOperations.run(() async {
      _ensureNotDisposed();
      if (_snapshot.phase != CameraCapturePhase.ready || !_snapshot.canZoom) {
        return _snapshot;
      }
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
        // Browser/device zoom support can disappear when the active track is
        // replaced. Preserve capture and report the capability failure.
        return _emit(
          _snapshot.copyWith(
            minimumZoom: 1,
            maximumZoom: 1,
            zoom: 1,
            errorMessage: 'Browser camera zoom is unavailable.',
          ),
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
      // Releasing the MediaStream remains necessary after capture failure.
    }
  }

  Future<void> _disposeController() async {
    final controller = _controller;
    _controller = null;
    if (controller == null) return;
    try {
      // camera_web stops the active MediaStream tracks during dispose.
      await controller.dispose();
    } catch (error) {
      _log?.call('Browser camera dispose failed: $error');
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

  CameraCaptureSnapshot _cameraExceptionState(
    plugin.CameraException error, {
    required String fallbackMessage,
  }) {
    final permission = _permissionStateFor(error);
    if (permission != null) {
      return _emit(
        _snapshot.copyWith(
          phase: CameraCapturePhase.permissionDenied,
          permission: permission,
          errorMessage: _browserErrorMessage(error),
        ),
      );
    }
    return _fail(fallbackMessage, error);
  }

  CameraCaptureSnapshot _fail(String message, Object error) {
    final rendered = error is plugin.CameraException
        ? _browserErrorMessage(error)
        : message;
    _log?.call('$rendered $error');
    return _emit(
      _snapshot.copyWith(
        phase: CameraCapturePhase.failed,
        errorMessage: rendered,
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

CameraPermissionState? _permissionStateFor(plugin.CameraException error) {
  final code = error.code.toLowerCase();
  if (code.contains('accessdeniedwithoutprompt')) {
    return CameraPermissionState.permanentlyDenied;
  }
  if (code.contains('accessrestricted')) {
    return CameraPermissionState.restricted;
  }
  if (code.contains('accessdenied') ||
      code.contains('notallowed') ||
      code.contains('permissiondenied')) {
    // Browsers do not portably expose whether a denial is temporary or stored.
    return CameraPermissionState.denied;
  }
  return null;
}

String _browserErrorMessage(plugin.CameraException error) {
  final code = error.code.toLowerCase();
  if (code.contains('cameratype') ||
      code == 'typeerror' ||
      code.contains('camerasecurity') ||
      code == 'securityerror') {
    return 'Browser camera access requires HTTPS or localhost and permission '
        'to use a video input device.';
  }
  if (_permissionStateFor(error) != null) {
    return 'Browser camera permission was not granted.';
  }
  if (code.contains('notfound')) {
    return 'No usable browser camera was found.';
  }
  return 'Browser camera error: $error';
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

CameraLensInfo _lensInfo(plugin.CameraDescription description, int index) {
  final browserName = description.name.trim();
  return CameraLensInfo(
    id: 'web-camera-$index:${browserName.isEmpty ? 'unnamed' : browserName}',
    name: browserName.isEmpty ? 'Camera ${index + 1}' : browserName,
    facing: switch (description.lensDirection) {
      plugin.CameraLensDirection.back => CameraLensFacing.back,
      plugin.CameraLensDirection.front => CameraLensFacing.front,
      plugin.CameraLensDirection.external => CameraLensFacing.external,
    },
    // camera_web documents sensor orientation as unsupported.
    sensorOrientation: 0,
  );
}

@JS('URL.revokeObjectURL')
external void _revokeObjectUrl(String url);
